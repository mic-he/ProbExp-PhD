// define a function to construct actual trials
function setupTrials() {
    
    var conditions = _.shuffle(['control','control','control','control',['dual','polar',3],['dual','polar',4],['dual','polar',5],['dual','wh',3],['dual','wh',4],['dual','wh',5],['plural','wh',3],['plural','wh',4],['plural','wh',5],['plural','polar',3],['plural','polar',4],['plural','polar',5]])
    //var conditions = _.shuffle(['control','control','control','control',['dual','polar',5],['dual','polar',5],['dual','polar',5],['dual','wh',5],['dual','wh',5],['dual','wh',5],['plural','wh',5],['plural','wh',5],['plural','wh',5],['plural','polar',5],['plural','polar',5],['plural','polar',5]])
    
    var scenarios = ['dual','plural']; //dual scenario: balls of two different colors; plural scenario: >2 different colors
    var quds = ['polar','wh'];//polar qud: will the ball be black/red? ; wh qud: what color will the ball be?
    var controls = _.shuffle([0,0,10,10]);
    var colors = ['red','blue','white','black'];
    //var colors = ['red','red','red','red'];
  	var howmany = conditions.length //how many trials depends on how many values we want to test

    var qudPic = "<img id='qPic' src='/static/images/{Q}-{C}.png'>"; // templates for pictures used in stimuli; E for expression, V for value, C for color, S for scenario, Q for qud
    var urnPic = "<img id='uPic' src='/static/images/{S}-{C}-{V}.png' align='bottom'>";
    var answerPic = "<img id='aPic' src='/static/images/{E}-{C}.png'>";
    
    var question = {
        'polar' : "The receiver asks: <b>will the ball be {C}?</b>", //{C} to be replaced with randomly picked color
        'wh' : "The receiver asks: <b>which color will the ball be?</b>"
    }
    var res = _.map(_.range(0, howmany), (w) => { //this function generates |howmany| trials, each being an object with several properties

    var trial = {};
    trial.kind="trial";
    trial.color=colors[Math.floor(Math.random()*4)];//randomly pick a color for the trial
    trial.condition = conditions.shift();//selects a previously unselected condition
    
    if (trial.condition=='control'){ //control trials need not be 'exhaustive', we simply run 4 of them two for each value (0,10) and randomized pick of scenario/qud
        trial.control=true; // flag this as control trial
        trial.value = controls.shift();//select a previously unselected control value
        trial.qud=quds[Math.floor(Math.random()*2)]; // randomly pick one qud for the control trial
        trial.scenario = scenarios[Math.floor(Math.random()*2)] //randomly pick one scenario        
    }else{ //critical trials have all the info encoded in the condition object
        trial.control=false; // flag this as critical trial
        trial.qud=trial.condition[1];
        trial.scenario = trial.condition[0];
        trial.value = trial.condition[2]
    }    
        
      
    trial.question=question[trial.qud];
        
    if (trial.qud=='polar'){trial.question=trial.question.replace('{C}', trial.color)}
        
    if (trial.qud=='polar'){
        trial.qudPic=qudPic.replace('{Q}', trial.qud).replace('{C}',trial.color);
    } else {
        trial.qudPic=qudPic.replace('{Q}', trial.qud).replace('{C}', 'dots');
    };
        

    trial.urnPic=urnPic.replace('{S}', trial.scenario).replace('{C}', trial.color).replace('{V}', trial.value);
    trial.answerPic=answerPic.replace('{E}', 'dots').replace('{C}', trial.color);
    trial.v=w; //used to count the trials
    trial.percentage = (100*trial.v)/howmany //we display progress to the participant as %
    trial.shortExpression="nomatter";    
    trial.option="nomatter";    
    return trial;
    });

    console.log(res);//I don't know why this is here

    return res;
    
}


module.exports = setupTrials;
