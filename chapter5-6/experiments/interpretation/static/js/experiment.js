var psiTurk = require('./psiturk');
var setupTrials = require('./specific/items');
var Questionnaire = require('./specific/ending');

class Experiment { //the main object of the whole thing
   
  constructor() {
    this.count = 0; //a counter to keep track of how many trials were dispalyed
    this.trialData = []; //initializes a vector to collect data
    this.allTrials = setupTrials(); //calls the function defined in items.js, which creates 12 trials
  }

  next() { //called when the subject clicks "next"
    if (this.count < this.allTrials.length) { //checkt whether more trials need to be built
      
      this.trial = this.allTrials[this.count]; //picks the this.count-th object constructed by setupTrial
      this.trialnumber = this.count+1; //just to number the trials starting from 1 instead of 0
          
        
      this.insertLines(this.trial); //function def'd below, used to replace the wanted elements (picked by id) with the text/html/... provided in items.js
        
      this.trialData.splice(0, 0, this.trialnumber,this.trial.kind,this.trial.expression); //concatenate the registered data
      
	  this.start = + new Date();//starting time of the trial
	    
      this.count++;//self-explanatory

    }
    else
      new Questionnaire().start();//when this.count equals the trials, display final questionnaire
  }

  insertLines(t) {//where t is a variables for trials, here called on this.trial
    
    $('#message').text(t.message);      
    $('#question1').html(t.question1); 
    $('#answer1').html(t.answer1);
    $('#question2').html(t.question2); 
    $('#answer2').html(t.answer2);      
    $('#please').html(t.please);
    $('#image').html(t.image); 
      
    $('#percentage').text(Math.floor(t.percentage)); //used to display the progress to the subject
    $('#percentageBis').text(Math.floor(t.percentageBis)); //same
      
  }


 save(e) { //function called when the subject clicks on button "next", checks stuff, records answers, cleans inputs
     var RT = + new Date() - this.start;// record reaction time
    
     //var input1 = document.getElementById('box1').value;
     //var input2 = document.getElementById('box2').value;
     //var input3 = document.getElementById('box3').value;
	 
     var input1 = document.getElementById('slider1_value').innerHTML;
     var input2 = document.getElementById('slider2_value').innerHTML;
     var input3 = document.getElementById('slider3_value').innerHTML;
     
     if (input1=="" || input2=="" || input3==""){
        alert("Please answer the question(s)!");       
     }
     else {
        
        if (parseInt(input2)>parseInt(input1)){
            alert("Your answer is impossible, please check again!")
        }
        else { 
            this.trialData = this.trialData.concat(input1,input2,input3,RT);//append answer and RT to the other data of this trial
            psiTurk.recordTrialData(this.trialData);		    
            this.trialData = [];//reset the data array, for the next trial
            document.getElementById('slider1').value="";//reset the slider value, for the next trial
            document.getElementById('slider2').value="";
            document.getElementById('slider3').value="";
            
            document.getElementById('dialogue_special').style.pointerEvents="none";//make second question and slider invisible and unclickable again
            document.getElementById('dialogue_special').style.opacity="0.3";
            document.getElementById('dialogue_special').style.filter="alpha(opacity=30)";
            
            //document.getElementById('box1').value="";// reset the checks
            //document.getElementById('box2').value="";
            //document.getElementById('box3').value="";
			
            document.getElementById('slider1_value').innerHTML="";// reset the checks
            document.getElementById('slider2_value').innerHTML="";
            document.getElementById('slider3_value').innerHTML="";
            
            document.getElementById('imgUrn').src="/static/images/whatsinside.png";//reset the pic of the urn
            this.next();
            }
     }
 }


  start() {
    psiTurk.showPage('item.html');
    $('#next').on('click', _.bind(this.save, this)); //when subject clicks "next", the function "save" is called (argument "this" is useless here)
    this.next(); //defined above
  }
}


module.exports = Experiment;
