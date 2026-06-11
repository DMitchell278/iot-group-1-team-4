import * as opcua from "node-opcua";
import * as fs from "fs";
import dotenv from "dotenv";
import { Worker } from "worker_threads";

async function main() {
    // Pull OPC UA server endpoint from env file
    dotenv.config({ path: "./.env.local" });
    const OPCUA_ENDPOINT = process.env.OPCUA_ENDPOINT;
    const PUBLISHING_INTERVAL = process.env.PUBLISHING_INTERVAL;
    const SAMPLING_INTERVAL = process.env.SAMPLING_INTERVAL;
    const CONFIG_PATH = process.env.CONFIG_PATH;

    // init mqtt publisher thread
    const mqtt_publisher = new Worker("./mqtt-publish.js");

    // load plc tags
    let plcTagsRaw = [];
    try {
        const rawData = fs.readFileSync(CONFIG_PATH, "utf8");
        plcTagsRaw = JSON.parse(rawData).opcuaTags;
    } catch (err) {
        console.error("Failed to load config file, using empty array", err);
    }

    // initiates a client-server connection and establishes an OPC UA session
    const opcuaClientInit = async () => {
        let client;
        try {
            // Layer 4 (TCP/IP) / 5 (Security) protocol establishment
            client = opcua.OPCUAClient.create({
                endpointMustExist: false,
            });
            await client.connect(OPCUA_ENDPOINT);
            console.log("Successfully connected to OPC UA server.");

            // Layer 7 OPC UA specific establishment
            // separated - means you can have multiple sessions per connection and persist sessions across connections
            const session = await client.createSession();
            console.log("Session started...");
            return { client: client, session: session };
        } catch (err) {
            console.error("OPC UA initializer failed:", err);
            if (client) await client.disconnect();
            throw err;
        }
    };
    //
    // Formats a list of raw PLC tags into OPC UA client library formatted jsons
    const getNodeIdList = (nodeIds) => {
        return nodeIds.map((id) => ({
            nodeId: id,
            attributeId: opcua.AttributeIds.Value,
        }));
    };

    // Subscribes to given OPCUA tags
    const opcuaSubInit = async (
        session,
        publishingInterval,
        samplingInterval,
        nodes,
    ) => {
        let subscription;
        try {
            // Sends subscription request to server and receives SubscriptionId, revised pubInt, keep-alive, lifetime, etc.
            subscription = opcua.ClientSubscription.create(session, {
                requestedPublishingInterval: publishingInterval, // How often the server sends data to the client
                requestedLifetimeCount: 100, // rlC * rPI = how long hte server maintains a connection without a client response
                requestedMaxKeepAliveCount: 10, // how often server sends keep alive msgs; also based on rPI
                maxNotificationsPerPublish: 100, // subscription responses track how many changes happen since last publish, this limits how many changes it can send at once
                publishingEnabled: true, // sets monitoring mode to true, can set to false for temporary pausing of monitoring
                priority: 1, // affects order that subscriptions are processed when the server is under high load
            });
            console.log("Subscription initiated.");

            const subParams = {
                samplingInterval: samplingInterval, // how often the server checks if the variable change
                discardOldest: true, // When incoming changes exceed the queue, they will get discarded
                queueSize: 1, // size of the incoming requests buffer
            };
            const monitoredItems = opcua.ClientMonitoredItemGroup.create(
                subscription,
                getNodeIdList(nodes),
                subParams,
            );

            return {
                subscription: subscription,
                monitoredItems: monitoredItems,
            };
        } catch (err) {
            console.error("OPC UA subscription setup failed:", err);
            if (subscription) await subscription.terminate();
            throw err;
        }
    };

    // Checks if the OPC UA response object holds valid and expected data
    const isValidResponse = (data) => {
        if (
            (typeof data?.value?.value === "number" &&
                !Number.isNaN(data.value.value)) ||
            typeof data?.value?.value === "boolean" ||
            (typeof data?.value?.value === "string" && data.value.value !== "")
        ) {
            // is a Number
            return { ok: true };
        }
        return { ok: false };
    };

    try {
        const { client, session } = await opcuaClientInit();
        const { subscription, monitoredItems } = await opcuaSubInit(
            session,
            PUBLISHING_INTERVAL,
            SAMPLING_INTERVAL,
            plcTagsRaw,
        );

        console.log("Subscription starting...");
        monitoredItems.on("changed", (monitoredItem, data) => {
            // Ensure value exists and is of the expected data type
            // In future can create a dictionary of that maps [monitoredItem] to its expected data type, or directly use OPC UA Data Type and this can be completely dynamic
            let isValid = isValidResponse(data);
            if (isValid.ok) {
                mqtt_publisher.postMessage({
                    timestamp: data.sourceTimestamp,
                    topic: monitoredItem.itemToMonitor.nodeId.toString(),
                    message: data.value.value,
                });
            }
        });

        subscription.on("terminated", () =>
            console.log("Subscription terminated."),
        );
        /*
            This is necessary, as the try block will close and the finally block will run, closing the session/client.
            Even though the event loop for the subscription is open, this stil happens and causes an error
        */
        await new Promise(() => {});
    } finally {
        console.log("[Process] Shutting down...");
        await session.close();
        await client.disconnect();
    }
}

main();
