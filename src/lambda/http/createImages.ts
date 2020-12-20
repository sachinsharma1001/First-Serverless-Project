import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';

const docClient = new AWS.DynamoDB.DocumentClient()
const s3 = new AWS.S3({
    signatureVersion: 'v4'
})
const groupsTable = process.env.GROUPS_TABLE
const imagesTable = process.env.IMAGES_TABLE;
const bucketName = process.env.IMAGES_S3_BUCKET;

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
        ...parsedBody,
        imageUrl: `https://${bucketName}.s3.amazonaws.com/${itemId}`
    }

    await docClient.put({
        TableName: imagesTable,
        Item: newItem
    }).promise()

    const url = getUploadUrl(itemId)

    return {
        statusCode: 201,
        headers: {
        'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            newItem: newItem,
            uploadUrl: url
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

function getUploadUrl(imageId: string) {
    return s3.getSignedUrl('putObject', {
      Bucket: bucketName,
      Key: imageId,
      Expires: 300
    })
  }