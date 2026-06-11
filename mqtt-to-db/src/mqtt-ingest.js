import mqtt, { MqttClient } from "mqtt";
import dotenv from "dotenv";
import { Worker } from "worker_threads";

dotenv.config({ path: "./.env.local" });

const BROKER = process.env.MQTT_BROKER_ENDPOINT;
const MQTT_BASE_TOPIC = process.env.MQTT_BASE_TOPIC;
const db_batch_store = new Worker("./db-store.js");

const client = mqtt.connect(BROKER, {
    clientId: "opcua-ingest-client",
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
});

client.on("connect", () => {
    console.log("Successfully connected to broker");
    client.subscribe(`${MQTT_BASE_TOPIC}/#`);
});

client.on("error", (err) => {
    console.error("MQTT Error:", err);
});

client.on("message", (topic, payload) => {
    // console.log(topic, ":\n\t", payload.toString());
    // const message = payload.toString();
    console.log("Posting message");
    db_batch_store.postMessage({
        topic: topic,
        payload: JSON.parse(payload.toString()),
    });
});
