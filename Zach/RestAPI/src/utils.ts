var config: any = readFileAsJSON("./config.json");
import * as fs from "fs";
import * as path from "path";

function setConfigurationFilename(fname: string): string {
  // add the path.dirname() of the program to /../ to go back one
  // level, then add the supplied filename
  let fn: string = path.dirname(import.meta.filename) + "/../" + fname;
  return fn;
}

function readFileAsArray(fname: string): string[] {
  try {
    let textlines: string[] = fs.readFileSync(fname).toString().split("\r\n");
    return textlines;
  } catch (err) {
    console.log(err);
    return []; // return empty array if file cannot be read
  }
}

function readFileAsJSON(fname: string): any {
  try {
    let data: string = fs.readFileSync(fname).toString();
    return JSON.parse(data);
  } catch (err) {
    console.log(err);
    return {}; // return empty JSON object
  }
}

function convertDataToInteger(data: any, def: number): number {
  let n: number = def;
  if (data != undefined) {
    n = parseInt(data.toString(), 10);
    if (Number.isNaN(n)) {
      n = def;
    }
  }
  return n;
}

function generateTimesTable(
  ttable: number,
  start: number,
  end: number,
): string[] {
  let output: string[] = [];
  let p: number = 0;
  let x: number = 0;
  for (x = start; x <= end; x++) {
    p = x * ttable;
    output.push(`${x} x ${ttable} = ${p}`);
  }
  return output;
}

// register the route handler for our API router for a HTTP GET request
// our route will be called /testapi, and its job is to respond with plain
// text indicating we've reached the endpoint
/*apiRouter.get("/timestable/:table", (req: Request, res: Response) => {
    console.log("table: ", req.params.table); // parameterized data
    console.log("query: ", req.query); // query data
    console.log("start: ", req.query.start); // query data
    console.log("end: ", req.query.end); // query data

    let ttable: number = convertDataToInteger(req.params.table, 1);
    let start: number = convertDataToInteger(req.query.start, 1);
    let end: number = convertDataToInteger(req.query.end, 10);
    let tableoutput: string[] = generateTimesTable(ttable, start, end);

    console.log(`ttable: ${ttable} start: ${start} end: ${end}`);

    // our custom support for the request to /testapi endpoint
    res.json(tableoutput);
  });
*/

// Router 2 Will Filter The Database
/*apiRouter2.get("/filter", (req: Request, res: Response) => {
    console.log("metric: ", req.params.table); // parameterized data
    console.log("limit: ", req.query); // query data
    console.log("timestamp start: ", req.query.start); // query data
    console.log("timestamp end: ", req.query.end); // query data

    let queryMetric: any = req.params.metric;
    let queryLimit: number = convertDataToInteger(req.query.end, 10);
    let queryFrom: number = convertDataToInteger(req.query.start, 1);
    let queryTo: number = convertDataToInteger(req.query.end, 10);
    let queryValue: String = "27";
    let tableoutput: string[] = [
      "Metric = " + queryMetric + " Value =" + queryValue,
    ];

    //loop to index to the query limit
    for (let i = 0; i < queryLimit; i++) {
      console.log(`table: ${queryMetric} start: ${queryFrom} end: ${queryTo}`);
      tableoutput.push("Metric = " + queryMetric + " Value =" + queryValue);
    }
    // our custom support for the request to /testapi endpoint
    res.json(tableoutput);
  });
*/
