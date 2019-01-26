function setupTrials() {
    
    var expressions = ["isPos","mightPos","probPos","cerPos","isLik","mightLik","probLik","cerLik","isUnlik","mightUnlik","probUnlik","cerUnlik"]; //a list of symbols for expr, to be shown to the participant.
    var kinds = ["c","f","c","f","c","f","c","f","c","f","c","f","c","f","c","f","c","f","c","f","c","f","c","f"]; //a list of repetitions for each kind of trials (among critical and filler)
	var howmany = kinds.length
    
    var expressionsC = _.shuffle(expressions); //randomize a first time for the expressions used in critical trials
    var expressionsF = _.shuffle(expressions); //randomize a second time for the expressions used in filler trials  

    var meta = { //a structured object with the materials needed for the exp
        
        'msg': "It {E} that the next ball will be red.", //the template message shown to the participant
        
        'isPos': "is possible", //associations beetween symbols and corresponding expressions, to be plugged into {E} 
        'mightPos': "might be possible",
        'probPos': "is probably possible",
        'cerPos': "is certainly possible",
        'isLik': "is likely",
        'mightLik': "might be likely",
        'probLik': "is probably likely",
        'cerLik': "is certainly likely",
        'isUnlik': "is unlikely",
        'mightUnlik': "might be unlikely",
        'probUnlik': "is probably unlikely",
        'cerUnlik': "is certainly unlikely",

                
        'c': { //the components of the critical trials: question about a and o, two sliders
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
            
        'f': {// the components ofthe filler trials: questions about n, one slider
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
    

    var res = _.map(_.range(0, howmany), (w) => { //this function generates |howmany| trials

        var trial = {};
    
        //basic properties of each trial    
        trial.kind = kinds.shift();//selects a previously unselected kind          
	   
        if (trial.kind == "c") {
            trial.expression = expressionsC.shift();//selects a previously unselected expression from the list (it actually removes the value from the vector)
        } 
        else {
            trial.expression = expressionsF.shift();
        }  
            
        //what follows builds the descriptions/items/stuff that will be displayed on the screen, replacing what's needed depending on kind and expression    
        trial.message = meta['msg'].replace('{E}', meta[trial.expression]);
        trial.question1 = meta[trial.kind].question1;
        trial.answer1 = meta[trial.kind].answer1;
        trial.question2 = meta[trial.kind].question2;
        trial.answer2 = meta[trial.kind].answer2;
        trial.please = meta[trial.kind].please; 
        trial.image=meta[trial.kind].image;    
        
        //what follows is used to give feedback about progress to the participant
        trial.v=w; 
        trial.percentage = (100*trial.v)/howmany
        trial.percentageBis = (100*trial.v)/howmany
        
        return trial;
    });

    console.log(res);//no idea why this is here

    return res;
    
}


module.exports = setupTrials;
