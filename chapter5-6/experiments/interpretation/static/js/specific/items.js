function setupTrials() {
    
    var expressions1 = _.shuffle(["cerNot","probNot","poss","prob","cer"]); //a shuffled list of symbols for expr, to be shown to the participant.
    var expressions2 = _.shuffle(["cerNot","probNot","poss","prob","cer"]);
    var kinds = ["c","f","c","f","c","f","c","f","c","f"]; //a shuffled list of repetitions for each kind of items (among critical and filler)
	var howmany = kinds.length

    var meta = { //a structured object with the materials needed for the exp
        
        'msg': "The next ball will {E} be red.",
        
        'cerNot': "certainly not",
        'probNot': "probably not",
        'poss': "possibly",
        'prob': "probably",
        'cer': "certainly",
                
        'c': {
                'question1': "How many balls do you think <b>the sender has drawn</b>?",
                'question2': "And how many <b>of them</b> do you think were <b>red</b>?",
                'answer1': "<span id='label_left'>0</span>"+
                          "<span id='label_right'>10</span>"+
                          "<div id='slider1_value' style='text-align:center';></div>"+
                          "<input id='slider1' type='range' min='0' max='10' step='1' value='' onClick='reportSlider1(this.value)' oninput='reportSlider1(this.value)'></input>",
                'answer2': "<span id='label_left'>0</span>"+
                          "<span id='label_right'>10</span>"+
                          "<div id='slider2_value' style='text-align:center';></div>"+
                          "<input id='slider2' type='range' min='0' max='10' step='1' value='' onClick='reportSlider2(this.value)' oninput='reportSlider2(this.value)'></input>"+
                        "<div style='display:none'>"+
                           "<div id='slider3_value' style='text-align:center';></div>"+
                          "<input id='slider3' type='range' min='0' max='10' step='1' value='' onClick='reportSlider3(this.value)' oninput='reportSlider3(this.value)'></input></div>",
                'please': "(please adjust the sliders in the way that best corresponds to your intuition)",
                'image':"<img id='imgUrn' src='/static/images/whatsoutside.png' height='243' width='145'>"
            },
            
        'f': {
                'question1': "How many <b>red</b> balls do you think there are <b>in the urn</b>?",
                'question2': "",
                'answer1': "<span id='label_left'>0</span>"+
                          "<span id='label_right'>10</span>"+
                          "<div id='slider3_value' style='text-align:center';></div>"+
                          "<input id='slider3' type='range' min='0' max='10' step='1' value='' onClick='reportSlider3(this.value)' oninput='reportSlider3(this.value)'></input>",
    
                'answer2': "<div style='display:none'>"+
                           "<div id='slider1_value' style='text-align:center';></div>"+
                          "<input id='slider1' type='range' min='0' max='10' step='1' value='' onClick='reportSlider1(this.value)' oninput='reportSlider1(this.value)'></input>"+
                           "<div id='slider2_value' style='text-align:center';></div>"+
                          "<input id='slider2' type='range' min='0' max='10' step='1' value='' onClick='reportSlider2(this.value)' oninput='reportSlider2(this.value)'></input></div>",
                'please': "(please adjust the slider in the way that best corresponds to your intuition)",
                'image':"<img id='imgUrn' src='/static/images/whatsinside.png' height='243' width='145'>"
            }
    
    };  
    

    var res = _.map(_.range(0, 10), (w) => { //this function generates 10 trials

    var trial = {};
    
    //basic properties of each trial    
    trial.kind = kinds.shift();//selects a previously unselected kind  
        
    if (trial.kind == "c") {
	trial.expression = expressions1.shift();//selects a previously unselected expression (it actually removes the value from the vector)	  
        } else {trial.expression = expressions2.shift();} 
            
    //what follows builds the descriptions/items/stuff that will be displayed on the screen, replacing what's needed depending on access/observation/kind    
    trial.message = meta['msg'].replace('{E}', meta[trial.expression]);
    trial.question1 = meta[trial.kind].question1;
    trial.answer1 = meta[trial.kind].answer1;
    trial.question2 = meta[trial.kind].question2;
    trial.answer2 = meta[trial.kind].answer2;
    trial.please = meta[trial.kind].please; 
    trial.image=meta[trial.kind].image;    
        
    trial.v=w; //used to count the trials
    trial.percentage = (100*trial.v)/howmany
    trial.percentageBis = (100*trial.v)/howmany
        
    return trial;
    });

    console.log(res);//I don't know why I have this

    return res;
    
}


module.exports = setupTrials;
