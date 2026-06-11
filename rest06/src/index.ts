/*
 * REST API microservice
 */

var config:any;

import * as fs from 'fs';
import * as path from 'path'; // will be used later on Day 5
import * as pg from 'pg';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

const PORT:number = 4000; // listen to port 4000 for web requests

function convertDataToInteger (data:any, def:number): number
{
	let n:number = def;
	if (data != undefined) 
		{
		n = parseInt (data.toString(), 10);
		if (Number.isNaN(n)) 
			{
			n = def;
			}
		}
	return n;
}

function generateTimesTable (ttable:number, start:number, end:number): string[]
{
	let output:string[] = [];
	let p:number = 0;
	let x: number = 0;
	for (x = start; x <= end; x++) {
	p = x * ttable;
	output.push(`${x} x ${ttable} = ${p}`);
	}
	return output;
}


function main()
{
	let s:string = "Hello Google";
	console.log (s);

	config = readFileAsJSON("./config.json");
	console.log ("Project title:", config.projectTitle);

	const app:express.Application = express(); // our new express app

	//Create a database pool
	const pool = new pg.Pool({
		host: config.sql.host,
		port: config.sql.port,
		database: config.sql.database,
		user: config.sql.user,
		password: config.sql.password
	});


	// middleware for logging purposes
	app.use ((req:Request, res:Response, next:NextFunction) => 
		{
		// our custom processing on each request to our application
		console.log (`${req.method} ${req.path}`);
		// continue default processing
		next();
		});


	// home route using the app object
	app.get ('/', (req: Request, res: Response) => {
		res.send ("Welcome to our first TypeScript REST API App!");
		});
	
		
	// set up route for simple web site file serving
	app.use (express.static('public'));

	// the API router for our test API
	const apiRouter:express.Router = express.Router();

	
	
	
	

		// the API router for our test API
	const apiRouter2:express.Router = express.Router();

	// middleware specific to this api router
	apiRouter2.use ((req:Request, res:Response, next:NextFunction) => 
		{
		console.log ("apiRouter2 specific middleware!");
		res.header('Access-Control-Allow-Origin', '*');
		next();
		});


	// register the route handler for our API router for a HTTP GET request
	// our route will be called /testapi, and its job is to respond with plain
	// text indicating we've reached the endpoint
	//apiRouter.get ('/testapi', (req:Request, res:Response) =>

	//api router for filtering our database
	apiRouter2.get('/robot/positions', async (req: Request, res: Response) => {
	try {
		const query = `
		SELECT server_timestamp, sensor_id, value
		FROM public.iot_events
		WHERE sensor_id IN ('ROBOTPOS.X','ROBOTPOS.Y','ROBOTPOS.Z')
		ORDER BY server_timestamp DESC
		Limit 100;
		`;

		const result = await pool.query(query);

		// ✅ group rows by timestamp
		const map = new Map<string, any>();

		result.rows.forEach(row => {
		const ts = new Date(row.server_timestamp).toISOString();

		if (!map.has(ts)) {
			map.set(ts, {
			server_timestamp: ts,
			x: null,
			y: null,
			z: null
			});
		}

      const obj = map.get(ts);

      if (row.sensor_id === 'ROBOTPOS.X') obj.x = Number(row.value);
      if (row.sensor_id === 'ROBOTPOS.Y') obj.y = Number(row.value);
      if (row.sensor_id === 'ROBOTPOS.Z') obj.z = Number(row.value);
    });

    // convert map → array
    const output = Array.from(map.values())
      .filter(r => r.x !== null && r.y !== null && r.z !== null);

	output.sort((a, b) =>
	new Date(a.server_timestamp).getTime() - 
	new Date(b.server_timestamp).getTime()
	);
    res.json(output);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch robot positions' });
  }
});



apiRouter2.get('/robot/status', async (req: Request, res: Response) => {
    try {
        const query = `
           SELECT device_id, sensor_id
			FROM public.iot_events
			WHERE sensor_id ='INITIALIZED'
			OR sensor_id ='RUNNING'
			OR sensor_id ='PAUSED'
			ORDER BY server_timestamp DESC;
		`;

        const result = await pool.query(query);

        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch robot status' });
    }
});

	// use the router we just defined
	app.use(apiRouter2);

	// start the server (a port listener)
	app.listen(PORT, () => {
	console.log (`Hello Seattle, I’m listening! (on port ${PORT})`);
	});

}

function readFileAsArray (fname:string): string[]
	{
	try {
 			let textlines:string[] = fs.readFileSync(fname).toString().split("\r\n");
 			return textlines;
		} catch (err) 
		{
 			console.log (err);
 			return []; // return empty array if file cannot be read
		}
	}

function readFileAsJSON (fname:string): any
	{
		try 
		{
			let data:string = fs.readFileSync(fname).toString();
			return JSON.parse (data);
		} 
		catch (err) 
		{
			console.log (err);
			return { }; // return empty JSON object
		}
	}


main();