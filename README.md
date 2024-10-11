# newman-reporter-pm2
newman-reporter that export result into pm2 metric

how to use custom-reporters:

https://learning.postman.com/docs/running-collections/using-newman-cli/command-line-integration-with-newman/#using-custom-reporters

npm install https://github.com/VoicenterTeam/newman-reporter-qryn

and add the following index.js file into your project 


```javascript
      
    const newman = require('newman'),  
        schedule = require('node-schedule');  
    var j = schedule.scheduleJob({second: 14}, function(){  
        console.log('Time for running our lazy newman!');  
        runCollection();  
    });  
    function finished(data,report) {  
        console.log(data,report);  
       // process.exit;  
    }  
    function runCollection() {  
        newman.run({  
            collection: './HelloWorld.postman_collection.json',  
            reporters: ['cli','qryn'],  
            reporter: {  
                qryn: {  
                    'option-name': 'option-value' // this is optional  
                }  
            }  
        },finished );  
    }  
    //runCollection();
```
