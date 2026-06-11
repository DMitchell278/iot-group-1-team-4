import * as pg from "pg";

export interface cycleTimeResponse {
  timeDiff: string;
  serverTimeStamp: string;
}
//Query SQL table data for part counter
export async function partCounter(start: string, end: string): Promise<number> {
  const client = new pg.Client({
    connectionString:
      "postgres://postgres:academy2024!@192.168.232.31:3306/academy16",
  });

  await client.connect();

  const sqlVar: string[] = [start, end];

  let sql_query: string = `SELECT
    COUNT(*) AS total_count
    FROM public.iot_events
WHERE sensor_id = 'ROBOTPOS.Z'
  AND value < -99
  AND server_timestamp BETWEEN $1
                          AND $2`;

  let result = await client.query(sql_query, sqlVar);
  //console.log(result);

  let part_count: number = parsedPartCount(result);
  console.log(part_count);

  return part_count;
}

//Query SQL data for cycle time
export async function cycleTime(
  start: string,
  end: string,
): Promise<cycleTimeResponse[]> {
  const client = new pg.Client({
    connectionString:
      "postgres://postgres:academy2024!@192.168.232.31:3306/academy16",
  });

  await client.connect();

  const sqlVar: string[] = [start, end];

  let cycletime: string = `SELECT
    server_timestamp,
    ABS(EXTRACT(EPOCH FROM (
        server_timestamp - LAG(server_timestamp) OVER (ORDER BY server_timestamp)
    ))) AS time_diff_seconds
FROM public.iot_events
WHERE sensor_id = 'ROBOTPOS.Z'
  AND value < -99
  AND server_timestamp BETWEEN $1
                          AND $2
ORDER BY server_timestamp`;

  let result = await client.query(cycletime, sqlVar);
  //console.log(result);
  let time_diff_array: cycleTimeResponse[] = parsedCycleTime(result);
  console.log(time_diff_array);

  return time_diff_array;
}

//Query SQL data for Torque
export async function Torque(start: string, end: string): Promise<number[]> {
  const client = new pg.Client({
    connectionString:
      "postgres://postgres:academy2024!@192.168.232.31:3306/academy16",
  });

  await client.connect();

  const sqlVar: string[] = [start, end];

  let torque: string = `SELECT COUNT(*) AS count_above_80_percent
            FROM public.iot_events
            WHERE sensor_id = 'MACTTORQUE[1]'
            AND ABS(value) > 0.8 * (
                SELECT MAX(ABS(value))
                FROM public.iot_events
                WHERE sensor_id = 'MACTTORQUE[1]');`;

  let result = await client.query(torque, sqlVar);
  //console.log(result);
  let torque_array: number[] = parsedTorque(result);
  console.log(torque_array);

  return torque_array;
}

function parsedCycleTime(result: pg.QueryResult<any>): cycleTimeResponse[] {
  let count: number = result.rowCount ?? 0;
  let time_diff_array: cycleTimeResponse[] = [];
  for (let index = 1; index < count; index++) {
    const cycleTimeValues: cycleTimeResponse = {
      timeDiff: result.rows[index].time_diff_seconds,
      serverTimeStamp: result.rows[index].server_timestamp,
    };
    //let time_diff: cycleTimeResponse = result.rows[index].time_diff_seconds;

    //console.log(result.rows[index]);
    time_diff_array.push(cycleTimeValues);
  }
  console.log("result test:", time_diff_array[5]?.serverTimeStamp);
  return time_diff_array;
}
// parse part count data
function parsedPartCount(result: pg.QueryResult<any>): number {
  let part_count: number = result.rows[0];
  return part_count;
}

function parsedTorque(result: pg.QueryResult<any>): number[] {
  let count: number = result.rowCount ?? 0;
  let torque_array: number[] = [];
  for (let index = 1; index < count; index++) {
    let torque: number = result.rows[index].torque;

    //console.log(result.rows[index]);
    torque_array.push(torque);
  }
  console.log("torque is", torque_array);
  return torque_array;
}
