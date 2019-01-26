var psiTurk = require('./psiturk');
var Experiment = require('./experiment');

var pages = [
	"instructions/instruction.html",
    "instructions/instruction0.html",
    "instructions/instruction1.html",
    "congratulations.html",
    "item_t.html",
	"item.html",
    "postquestionnaire.html"
];

var instructionPages = [
	"instructions/instruction.html",
    "instructions/instruction0.html",
    "instructions/instruction1.html"
];

psiTurk.preloadPages(pages);

// Task object to keep track of the current phase
var currentview;
var exp = new Experiment();

// RUN TASK
$(window).load(() => {
    psiTurk.doInstructions(
    	instructionPages,// list of instruction pages. they should contain a button with class=continue. when it's clicked, the next page is shown. after the last one, the following func is called
        function() { currentview = exp.start(); }// start is defined in experiment.js
    );
});
