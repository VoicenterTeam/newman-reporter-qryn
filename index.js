module.exports= function (emitter, reporterOptions, collectionRunOptions) {

    console.log("reporterOptions",reporterOptions);
    console.log("collectionRunOptions",collectionRunOptions);
    emitter.on('done', function (err, summary) {
        if (err || summary.error) {
            console.error('collection run encountered an error.');
        }
        else {
            console.log('collection run completed.');
            console.log('summary',summary);
        }
    });
  // emitter is is an event emitter that triggers the following events: https://github.com/postmanlabs/newman#newmanrunevents
  // reporterOptions is an object of the reporter specific options. See usage examples below for more details.
  // collectionRunOptions is an object of all the collection run options:
  // https://github.com/postmanlabs/newman#newmanrunoptions-object--callback-function--run-eventemitter
};
