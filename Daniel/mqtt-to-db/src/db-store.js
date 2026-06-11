import { error } from "console";
import { Client } from "pg";
import { parentPort } from "worker_threads";

const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS } = process.env;
const MQTT_BASE_TOPIC = process.env.MQTT_BASE_TOPIC;
const FLUSH_INTERVAL = process.env.FLUSH_INTERVAL;
// In the case that passwords contain special characters; Which they often do in industrial systems
const encodedPass = encodeURIComponent(DB_PASS);
const connectionString = `postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
const DEVICE_ID_INDEX = MQTT_BASE_TOPIC.split("/").length; // following UNS documentation, this index will always have the device ID
const VALS_PER_EVENT = 4;
const config = {
    // only creates the object, no communication with the server
    connectionString: connectionString,
    keepAlive: true,
};

// ingest buffer to handle ingest bursts and facillitate batch writes
var buffer = [];
var connecting = false;
const client = new Client(config);

// Connect to database with a max 3 retries
const connectWithRetry = async () => {
    connecting = true;
    let attempts = 0;
    while (attempts <= 3) {
        attempts += 1;
        try {
            await client.connect();
            console.log("Successfully connected to the database");
            connecting = false;
            break;
        } catch (err) {
            console.log("Failed to connect to Database:", err);
            await new Promise((res) => setTimeout(res, 1000));
        }
    }
    if (connecting) {
        // If the client is still trying to connect, i.e. it never successfully connected, then shut down
        console.log(
            "Critical Error: Cannot connect to the database after 3 attempts. Shutting down...",
        );
        process.exit(1);
    }
};

// Check if required values in the event exist
const isValidEvent = (event) => {
    if (event.payload.value && event.payload.timestamp) {
        return true;
    }
    return false;
};

// Extract metadata from event object
const processMsg = (event) => {
    const subheaders = event.topic.split("/");
    const deviceId = subheaders[DEVICE_ID_INDEX];
    const sensorId = subheaders.slice(DEVICE_ID_INDEX + 1).join("."); // all topics after device header are joined together to set the sensor_id
    return { deviceId: deviceId, sensorId: sensorId };
};

// convert boolean to integer value
function toInt(value) {
    if (typeof value === "boolean") return value ? 1 : 0;
    if (typeof value === "number") return value;
    throw new Error("Expected boolean or number");
}

// Insert buffer values into database
const flushBuffer = async () => {
    if (connecting) {
        return;
    }
    console.log("Flushing buffer...");
    // Extract and flush buffer
    const events = buffer;
    buffer = [];
    var base = 0;

    try {
        await client.query("BEGIN");

        // uniform list of payload values that are inserted into the database
        let values = [];
        const varMarkers = events
            .map((event, i) => {
                // console.log("event:", event.payload);
                if (isValidEvent(event)) {
                    const { deviceId, sensorId } = processMsg(event);
                    let value = toInt(event.payload.value);
                    values.push(
                        deviceId,
                        sensorId,
                        value,
                        event.payload.timestamp,
                    );
                    const result = `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
                    base += VALS_PER_EVENT; // SQL syntax accomodation since you have to number each placeholder (varmarker)
                    return result;
                }
            })
            .filter(Boolean)
            .join(",");
        // console.log("values:", values.length);
        // console.log("markers:", varMarkers);
        if (values.length === 0) {
            throw new Error("No valid events");
        }
        await client.query(
            `INSERT INTO iot_events (device_id, sensor_id, value, server_timestamp) VALUES ${varMarkers}`,
            values,
        );

        await client.query("COMMIT");
        console.log("Buffer has been flushed");
    } catch (err) {
        await client.query("ROLLBACK");
        buffer = [...events, ...buffer];
        console.log("Failed to insert into database:", err);
    }
};

// Restart and report client connection on error
client.on("error", async (err) => {
    console.error("Database client error:", err.message);
    client.end().catch(() => {});
    client = new Client(config);
    connectWithRetry();
});

// Recieve from mqtt-ingest.js main thread; Immediately push to event buffer
parentPort.on("message", (event) => {
    // console.log("Processing event on topic:", event);
    if (buffer.length > 5000) {
        console.warn("CAUTION: Buffer is getting large!");
    } else if (buffer.length > 10000) {
        return;
    }
    buffer.push(event);
});

/*
    Connect to databse and flush event buffer to database every 2 seconds
*/
await connectWithRetry();
setInterval(() => flushBuffer(), FLUSH_INTERVAL);
