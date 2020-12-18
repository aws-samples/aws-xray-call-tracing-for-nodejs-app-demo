## API Call tracing with AWS X-Ray
This demo showcases how to trace api calls in nodejs with AWS X-Ray. You will build a simple demo application using AWS Cloud9 IDE. The app starts a server listener on a defined port, and then use a client to make an API call that retrieves data from a backend database instance which is Amazon Aurora MySQL. 

##Prerequisites
- Node Package Manager (npm)
- AWS CLI
- valid AWS Account

## Creating database instance
For this demo you will use Amazon Aurora serverless for MySQL. 

1. Run the following AWS CLI command from your terminal to create your db cluster:

		aws rds create-db-cluster --db-cluster-identifier <replace-with-your-clusterid> --engine aurora --engine-version 5.6.10a --engine-mode serverless --master-username <replace-with-your-username> --master-user-password <replace-with-your-password>

2. Enable the [Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html) in order to interact with the Amazon Aurora serverless db cluster as a web service interface from AWS CLI

		aws rds modify-db-cluster \
		    --db-cluster-identifier <replace-with-your-clusterid \
		    --enable-http-endpoint
3. Run the command below to store your database credentials in AWS Secrets Manager

		aws secretsmanager create-secret --name <replace-with-your-secretname> --secret-string file://mycreds.json

This command assumes you've placed your secret, such as this example JSON text structure below in a file named `mycreds.json`.

	{
	"username":"anika",
	"password":"aDM4N3*!8TT"
	}

More details on [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/manage_create-basic-secret.html) can be found in the online documentation.

4. Create a database instance from your AWS console and populate it with data using the following steps:

- Use the query editor to connect to your db cluster using the secret you created in step 3 as shown in the screenshot below

<p align="left">
  <img width="500" height="300" src="https://github.com/aws-samples/aws-xray-call-tracing-for-nodejs-app-demo/blob/main/img/connecttoaurora.png">
</p>

- Run the following SQL query to create your db instance:

		CREATE DATABASE <replace-with-your-db-instance-name>;

<p align="left">
  <img width="500" height="300" src="https://github.com/aws-samples/aws-xray-call-tracing-for-nodejs-app-demo/blob/main/img/queryeditor.png">
</p>

- Run the following SQL query as shown in the screenhot below to create a `customers` table in your db instance:

		CREATE TABLE customers (firstname VARCHAR(20), lastname VARCHAR(20),
		       Address VARCHAR(20), sex CHAR(1), birth DATE;

- Run the following query to populate your newly created table in your db instance:

		INSERT INTO 
			customers(firstname , lastname, Address, sex, birth)
		VALUES
			('Paul','Derreck','10 street close','m','1977-03-30'),
			('Pauline','Joice','10 street close', 'f','1999-03-30');

- Run the following AWS CLI command to check that you can query your database instance using the data API

		aws rds-data execute-statement --resource-arn <"replace-with-your-resource-arn"> --database <"replace-with-your-db-instance"> --secret-arn <"replace-with-your-secret-arn"> --sql "show tables"
		
You should see the following output:

	{
	    "numberOfRecordsUpdated": 0,
	    "records": [
	        [
	            {
	                "stringValue": "customers"
	            }
	        ]
	    ]
	}

## Building our demo app
Now that your db instance has been created and populated with customers' records, you can start building your application using AWS Cloud9.
Start AWS Cloud 9 environment and run the following npm commands:

`npm init` to initialize your project and create a new `package.json` file.

	npm i --s express express-handlebars mongoose body-parser mysql aws-sdk sleep aws-xray-sdk

Provide the required information and the contents of your `package.json` should look like [this one](url) 


Run the command `npm i -g nodemon` to install nodemon

You can clone the repo or simply copy paste the contents of the file: `index.js` which are the full source code of the demo app.

## Configure AWS X-Ray
You need to update the code in the `index.js` file to include AWS X-Ray SDK in order to trace call requests to your app. 

You need the following piece of code to initialize AWS X-Ray SDK

    var AWSXRay = require('aws-xray-sdk');
    app.use(AWSXRay.express.openSegment('MydemoApp'));
    ...
    app.use(AWSXRay.express.closeSegment());

You could also Capture SQL queries using the code below:

	var AWSXRay = require('aws-xray-sdk');
	var mysql = AWSXRay.captureMySQL(require('mysql'));
	...
	var connection = mysql.createConnection(config);

## Assign the required IAM permissions to EC2 instance of Cloud9
In order the underlying EC2 for your AWS Cloud9 environment to be able to connect to your database, your need to make sure that you add an inbound rule in your Aurora DB cluster to allow the IP address of the EC2 for Cloud9 to connect to the DB on port 3306. More details on how to work with Security groups can be found [here](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/authorizing-access-to-an-instance.html).

You also need to create an IAM role to allow the EC2 of your Cloud9 instance to access AWS X-Ray. For details on how to add an IAM role to Amazon EC2 instance can be found [here](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html).

## Testing your application

Start the demo application either by pressing the green run button in AWS Cloud9 or run the following command: `nodemon index.js`
You should see the output shown in the screenshot below:

<p align="left">
  <img width="400" height="250" src="https://github.com/aws-samples/aws-xray-call-tracing-for-nodejs-app-demo/blob/main/img/startapp.png">
</p>

Now run the following command to send an API GET request to the app in order to query the database

`curl http://localhost:8080/customers | json`. You should see the output shown in the screenshot below:
<p align="left">
  <img width="500" height="300" src="https://github.com/aws-samples/aws-xray-call-tracing-for-nodejs-app-demo/blob/main/img/normalrequest.png">
</p>

In AWS X-Ray console you can trace your request which should look like the one shown in the screenshot below:

<p align="left">
  <img width="600" height="400" src="https://github.com/aws-samples/aws-xray-call-tracing-for-nodejs-app-demo/blob/main/img/xray1.png">
</p>

Now let's add some bad code to the application to mimic a scenario that could happen in a production system whereby an application could start to experience performance issue which could impact end-users experience. And when this app the DevOps team need to try to identify the root cause of the performance issue quickly to be able to fix it and this is where AWS X-Ray comes very handy.

Modify the index.js by adding the two lines of code below:

	var sleep = require('sleep');
	sleep.sleep(10); // sleep for ten seconds

This is already done for you in the file `index-with-bad-code.js`

Now replace the contents of `index.js` with the ones from `index-with-bad-code.js` or change the `package.json` to make `index-with-bad-code.js` your main app entry point and then run the command `nodemon index.js` or `nodemon index-with-bad-code.js` 

Notice that your application will pause for 10 sec which can be seen in the screenshot below under Time Spent or Time Total column.

<p align="left">
  <img width="500" height="300" src="https://github.com/aws-samples/aws-xray-call-tracing-for-nodejs-app-demo/blob/main/img/slowrequest.png">
</p>

You can trace the problematic request from your AWS X-Ray console and from the screenshot below we see that the delay occurs when the app server tries to connect to the database which corresponds to the 10 sec sleep you added in the code. 

<p align="left">
  <img width="600" height="400" src="https://github.com/aws-samples/aws-xray-call-tracing-for-nodejs-app-demo/blob/main/img/xray2.png">
</p>

You can zoom in on the problematic layer (database in this case) to see the response time distrubution over a period of time (e.g. last hour) as shown in the screenshot below.

<p align="left">
  <img width="500" height="300" src="https://github.com/aws-samples/aws-xray-call-tracing-for-nodejs-app-demo/blob/main/img/xray6.png">
</p>

Please refer to the AWS X-Ray [online documentation](https://docs.aws.amazon.com/xray/latest/devguide/xray-console-analytics.html) for more details on what data can be captured and analyzed from AWS X-Ray Analytics.

While this example is very simplistic and the issue was known in advance because you  manually added some bad code to your code source, in a production environment where customers generally have many microservices applications talking to each other including making external call to SaaS applications, trying to isolate the root cause of performance problem is a bit like trying to find a needle in a haystack. AWS X-Ray is able to open up the black box of your complex application ecosystem for your and point your to the root cause of issue so that you can fix it very quickly without the end-users even noticing it.

## Summary
In this demo, you demonstrated how to use AWS X-Ray to trace API calls for a nodejs application which allows a client to send a GET request and retrieve data from a backend Amazon Aurora serverless database. AWS X-Ray helped isolate quickly and easily slow requests thereby enabling DevOps team to fix the issue very quickly.

## Licence
This library is licensed under the MIT-0 License. See the LICENSE file.

