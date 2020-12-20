import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';

const docClient = new AWS.DynamoDB.DocumentClient()
const groupsTable = process.env.GROUPS_TABLE
const imagesTable = process.env.IMAGES_TABLE;

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log("Create Image:" + event);

    const groupId = event.pathParameters.groupId;

    const validGroupId = await groupExists(groupId);
    if(!validGroupId) {
        return {
            statusCode: 404,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Group Id does not exists...'
            })
        }
    }

    const parsedBody = JSON.parse(event.body);
    const itemId = uuid.v4();
    const timestamp = new Date().toISOString();
    
    const newItem = {
        groupId,
        timestamp,
        itemId,
        ...parsedBody
    }

    await docClient.put({
        TableName: imagesTable,
        Item: newItem
    }).promise()

    return {
        statusCode: 201,
        headers: {
        'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            newItem
        })
    }
}

async function groupExists(groupId: string) {
    const result = await docClient.get({
        TableName: groupsTable,
        Key: {
            id: groupId
        }
    }).promise()

    return !!result.Item;
}