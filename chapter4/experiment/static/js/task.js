var psiTurk = require('./psiturk');
var Experiment = require('./experiment');

var pages = [
	"instructions/instruction.html",
    "instructions/instruction1.html",
    "instructions/instruction2.html",
	"item.html",
    "postquestionnaire.html"
];

var instructionPages = [
	"instructions/instruction.html",
    "instructions/instruction1.html",
    "instructions/instruction2.html"
];

psiTurk.preloadPages(pages);

// Task object to keep track of the current phase
var currentview;

// RUN TASK
$(window).load(() => {
    psiTurk.doInstructions(
    	instructionPages,// list of instruction pages. they should contain a button with class=continue. when it's clicked, the next page is shown. after the last one, the following func is called
        function() { currentview = new Experiment(); }// start is defined in experiment.js
    );
});
