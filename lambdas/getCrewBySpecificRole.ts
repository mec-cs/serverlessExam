import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {

        console.log("[EVENT]", JSON.stringify(event));

        const parameters = event?.pathParameters;
        const role = parameters?.role ? parameters?.role : undefined;
        const movieId = parameters?.movieId ? parseInt(parameters?.movieId) : undefined;
        const nameSubStr = event.queryStringParameters?.name ? event.queryStringParameters?.name : undefined;

        if (!role || !movieId) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ "error": "Invalid or empty path parameters!" }),
            };
        }

        let queryCommandInput: QueryCommandInput = {
            TableName: process.env.TABLE_NAME,
            KeyConditionExpression: "#crewRole = :role and #movieId = :movieId",
            ExpressionAttributeNames: {
                "#crewRole": "crewRole",
                "#movieId": "movieId",
            },
            ExpressionAttributeValues: {
                ":role": role,
                ":movieId": movieId,
            },
        }

        if (nameSubStr) {
            queryCommandInput = {
                TableName: process.env.TABLE_NAME,
                KeyConditionExpression: "#crewRole = :role and #movieId = :movieId",
                FilterExpression: "contains(#names, :n)",
                ExpressionAttributeNames: {
                    "#crewRole": "crewRole",
                    "#movieId": "movieId",
                    "#names": "names",
                },
                ExpressionAttributeValues: {
                    ":role": role,
                    ":movieId": movieId,
                    ":n": nameSubStr,
                },
            };
        }

        const getCrewCommandOutput = await ddbDocClient.send(
            new QueryCommand(queryCommandInput)
        );

        if (!getCrewCommandOutput.Items) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ "error": "No item found with the filter!" }),
            };
        }

        const bodyOutput = {
            data: getCrewCommandOutput.Items,
        };

        console.log("[GET] ", JSON.stringify(bodyOutput));

        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(bodyOutput),
        };
    } catch (error: any) {
        console.log("[ERROR]", JSON.stringify(error));
        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ "error": error }),
        };
    }
}

function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    const marshallOptions = {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
        wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
