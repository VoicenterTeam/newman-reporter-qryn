# newman-reporter-pm2
newman-reporter that export result into pm2 metric

how to use custom-reporters:

https://learning.postman.com/docs/running-collections/using-newman-cli/command-line-integration-with-newman/#using-custom-reporters

npm install https://github.com/voicenter/newman-reporter-pm2

and add the following index.js file into your project 


`
      
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
            collection: './test.postman_collection.json',  
            reporters: ['cli','pm2'],  
            reporter: {  
                pm2: {  
                    'option-name': 'option-value' // this is optional  
                }  
            }  
        },finished );  
    }  
    //runCollection();
