/*
 * index.ts
 * This program will send cycletime and part count information as JSON data to an API that is requesting information
 */

import express from "express";
import type { Request, Response, NextFunction } from "express";
import * as Query from "./Query.js";

async function main() {
  const PORT: number = 4000; // listen to port 4000 for web requests
  const app: express.Application = express(); // our new express app

  // middleware for logging purposes
  app.use((req: Request, res: Response, next: NextFunction) => {
    // our custom processing on each request to our application
    console.log(`${req.method} ${req.path}`);
    // continue default processing
    next();
  });

  // home route using the app object
  app.get("/", (req: Request, res: Response) => {
    res.send("Welcome to our first TypeScript REST API App!");
  });

  // set up route for simple web site file serving
  app.use(express.static("public"));

  const apiRouter: express.Router = express.Router();

  // middleware specific to this api router
  apiRouter.use((req: Request, res: Response, next: NextFunction) => {
    console.log("apiRouter specific middleware!");
    res.header("Access-Control-Allow-Origin", "*");
    next();
  });

  /*
    endpoint: localhost:4000/cycletime
    parameters: start:string, end:string

 */
  apiRouter.get("/cycletime", async (req: Request, res: Response) => {
    let queryStartTime: string = String(req.query.start);
    let queryEndTime: string = String(req.query.end);

    if (!isDateValid(queryStartTime, queryEndTime)) {
      res.json({ error: "Invalid parameters." });
      return;
    }

    let cycle_time: Query.cycleTimeResponse[] = await Query.cycleTime(
      queryStartTime,
      queryEndTime,
    );
    res.json({ result: cycle_time });
  });

  /*
    endpoint: localhost:4000/partcount
    parameters: start:string, end:string
 */
  apiRouter.get("/partcount", async (req: Request, res: Response) => {
    let queryStartTime: string = String(req.query.start);
    let queryEndTime: string = String(req.query.end);

    if (!isDateValid(queryStartTime, queryEndTime)) {
      res.json({ error: "Invalid parameters." });
      return;
    }

    let part_count: number = await Query.partCounter(
      queryStartTime,
      queryEndTime,
    );
    res.json(part_count);
  });

  apiRouter.get("/torque", async (req: Request, res: Response) => {
    let queryStartTime: string = String(req.query.start);
    let queryEndTime: string = String(req.query.end);

    if (!isDateValid(queryStartTime, queryEndTime)) {
      res.json({ error: "Invalid parameters." });
      return;
    }

    let torque: number[] = await Query.Torque(queryStartTime, queryEndTime);
    res.json(torque);
  });

  // use the router we just defined
  app.use(apiRouter);

  // start the server (a port listener)
  app.listen(PORT, () => {
    console.log(`Hello Cambridge, I’m listening! (on port ${PORT})`);
  });
}

//Function to ensure date is valid
function isDateValid(queryFrom: string, queryTo: string): boolean {
  let queryFromDate = new Date(queryFrom);
  let queryToDate = new Date(queryTo);
  if (isNaN(queryFromDate.getTime())) {
    return false;
  }

  if (isNaN(queryToDate.getTime())) {
    return false;
  }
  return true;
}

async function getData(url: string) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }

  return res.json();
}

async function testAPI(
  baseUrl: string = "http://127.0.0.1:4000",
): Promise<void> {
  // Get the input field
  const input = document.getElementById("whichTable") as HTMLInputElement;

  if (!input) {
    console.error("Input field #whichTable not found");
    return;
  }

  // Parse the value into a number
  const tableNum = Number(input.value);

  // Validate the number
  if (isNaN(tableNum) || tableNum < 1) {
    alert("Please enter a valid number (1 or higher)");
    return;
  }

  // Build the full URL for /timestable/:table
  const url = `${baseUrl}/timestable/${tableNum}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();

    console.log("Times table data:", data);

    // Optional: display in the page
    const output = document.getElementById("output");
    if (output) {
      output.textContent = JSON.stringify(data, null, 2);
    }
  } catch (err) {
    console.error("Error fetching times table:", err);
  }
}

function renderNumber(): void {
  const el = document.getElementById("output");
  if (!el) return;

  el.textContent = Query.partCounter.toString();
}

main();
