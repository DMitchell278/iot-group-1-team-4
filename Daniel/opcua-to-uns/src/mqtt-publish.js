import mqtt, { MqttClient } from "mqtt";
import { parentPort } from "worker_threads";

// Retrieve environment variables
const BROKER = process.env.MQTT_BROKER_ENDPOINT;
const MQTT_BASE_TOPIC = process.env.MQTT_BASE_TOPIC;

// connect to mqtt broker
const client = mqtt.connect(BROKER, {
    clientId: "opcua-publish-client",
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
});

// log when client connects
client.on("connect", () => {
    console.log("Successfully connected to broker");
});

// log on client error
client.on("error", (err) => {
    console.error("MQTT Error:", err);
});

// receieve from mqtt-ingest.js main thread
parentPort.on("message", (data) => {
    console.log("Posting value for:", data.topic);

    const header = data.topic.substring(7); // Remove "ns=1;s="
    const subheaders = header.split("."); // separate the PLC tag into its components
    // const hlen = subheaders.length;
    var topic = `${MQTT_BASE_TOPIC}`;

    // reconstruct PLC tag into a nested UNS topic structure
    // PLC tags have generic "HMI_GVL.M" at start always, remove when processing to reduce topic bloat
    for (const subheader of subheaders.slice(2)) {
        topic = topic + "/" + subheader;
    }

    // Publish to UNS
    const timestamp = new Date().toISOString();
    const payload = {
        topic: header,
        timestamp: timestamp,
        value: data.message,
    };
    client.publish(topic, JSON.stringify(payload), { qos: 0, retain: true });
});

process.on("SIGINT", () => {
    console.log("Shutting down...");
    client.end(false, () => {
        console.log("MQTT connection closed");
        process.exit(0);
    });
});
