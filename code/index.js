// Use this code snippet in your app.
// If you need more information about configurations or implementing the sample code, visit the AWS docs:
// https://aws.amazon.com/developers/getting-started/nodejs/
// Load the AWS SDK
//exports.handler = (event, context, callback) => {
var AWS = require('aws-sdk'),
    region = "us-east-1",
    secretName = "rds-db-credentials/cluster-Y4ZV65UQ4NVBOY7XCC2SMKFVAY/admin",
    secret,
    decodedBinarySecret;
// Create a Secrets Manager client
var client = new AWS.SecretsManager({
    region: region
});
// In this sample we only handle the specific exceptions for the ‘GetSecretValue’ API.
// See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
// We rethrow the exception by default.
client.getSecretValue({
    SecretId: secretName
}, function(err, data) {
    if (err) {
        if (err.code === 'DecryptionFailureException')
            // Secrets Manager can’t decrypt the protected secret text using the provided KMS key.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'InternalServiceErrorException')
            // An error occurred on the server side.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'InvalidParameterException')
            // You provided an invalid value for a parameter.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'InvalidRequestException')
            // You provided a parameter value that is not valid for the current state of the resource.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
        else if (err.code === 'ResourceNotFoundException')
            // We can’t find the resource that you asked for.
            // Deal with the exception here, and/or rethrow at your discretion.
            throw err;
    } else {
        // Decrypts secret using the associated KMS CMK.
        // Depending on whether the secret is a string or binary, one of these fields will be populated.
        if ('SecretString' in data) {
            secret = data.SecretString;
        } else {
            let buff = new Buffer(data.SecretBinary, 'base64');
            decodedBinarySecret = buff.toString('ascii');
        }
    }

    const express = require('express');
    const bodyparser = require('body-parser');
    var app = express();
    //Configuring express server
    app.use(bodyparser.json());

    //Parsing secret JSON object
    const secretJSON = JSON.parse(secret);

    // Instrument MySQL db with X-Ray to trace SQL queries
    var AWSXRay = require('aws-xray-sdk');
    var mysql = AWSXRay.captureMySQL(require('mysql'));
    //Pass credentials info to connection
    var con = mysql.createConnection({
        host: secretJSON.host,
        user: secretJSON.username,
        password: secretJSON.password,
        //database: secretJSON.dbname
        database: 'auroraserverlessdb'
    });

    con.connect((err) => {
        if (!err)
            console.log('Connection Established Successfully');
        else
            console.log('Connection Failed!' + JSON.stringify(err, undefined, 2));
    });

    //Establish the server connection
    const port = process.env.PORT || 8080;
    app.listen(port, () => console.log(`Listening on port ${port}..`));

    //Initialize AWS X-Ray SDK
    var AWSXRay = require('aws-xray-sdk');
    app.use(AWSXRay.express.openSegment('MydemoApp'));

    //Creating GET Router to fetch all customers details from Amazon Aurora MySQL db
    app.get('/customers', (req, res) => {
        //Inserting bad piece of code to slow down the application
        //var sleep = require('sleep');
        //sleep.sleep(10); // sleep for ten seconds
        con.query('SELECT * FROM customers', (err, rows, fields) => {
            if (!err)
                res.send(rows);
            else
                console.log(err);
        });
    });
    app.use(AWSXRay.express.closeSegment());
});