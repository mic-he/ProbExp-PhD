// define a function to construct training trials
function setupTrainings() {
    
    var options = _.shuffle(['singlebet','multibet','singlebet','multibet']); //betting option offered to subject; singlebet: either bet on red, or dont bet at all; multibet: bet on X where X one of the possible colors, or dont bet at all
    var colors = ['red', 'black']; //two possible focal color, not really important but to add some variations, make it less boring
    var expressions = _.shuffle(['certNot','probNot','prob','cert']); //a shuffled list of expressions, ie the replys sent by the speaker
	var howmany = 3; //how many trials? 
    
    var description = {//a structured object, function of the selected option  
            'singlebet': "You can bet on <b><font color='{C1}'>{C2}</font></b> or don't bet at all.",
            'multibet': "You can bet on <b><font color='black'>black</font></b> or <b><font color='blue'>blue</font></b> or <b><font color='red'>red</font></b> or <span style='background-color:black;'><b><font color='white'>white</style></font></b></span> or don't bet at all."
    };
    var message = "The sender says: <b>the ball will {E} be {C1}</b>"; //{E} to be replaced with randomly picked message in each trial, {C}s with picked color
    var longExpressions={ //dictionary from abbreviated expression to real language
        'certNot':'certainly not',
        'probNot':'probably not',
        'prob':'probably',
        'cert':'certainly'        
    };
    
    var senderpic = "<img id='imgComic1' src='/static/images/{E}_{C}_sender.png'>"; // template for stimuli; E for expression, C for color
    
    var polarbutton='<button type="button" id="polar" value="{C1}" class="btn btn-primary btn-lg" onclick="report0(this.value)"> will it be {C2}?</button>'; // {C}s to be replaced with picked color
    var betbuttons = {//a structured object, function of the selected option
        'singlebet':'<button type="button" id="{C1}" value="{C2}" class="btn btn-primary btn-lg" onclick="report(this.value)">bet on <b><font color="{C3}">{C4}</font></b></button>',
        'multibet':'<button type="button" id="black" value="black" class="btn btn-primary btn-lg" onclick="report(this.value)">bet on <b><font color="black">black</font></b></button>'+
                    ' '+    
                    '<button type="button" id="blue" value="blue" class="btn btn-primary btn-lg" onclick="report(this.value)">bet on <b><font color="blue">blue</font><b/></button>'+
                    ' '+
                    '<button type="button" id="red" value="red" class="btn btn-primary btn-lg" onclick="report(this.value)">bet on <b><font color="red">red</font></b></button>'+
                    ' '+
                    '<button type="button" id="white" value="white" class="btn btn-primary btn-lg" onclick="report(this.value)">bet on <b><font color="white">white</font></b></button>'
    };
         
    var res = _.map(_.range(0, howmany), (w) => { //this function generates |howmany| trials, each being an object with several properties
        var trial = {};
        trial.kind="training";
        trial.option = options.shift();//selects a previously unselected betting option 
        trial.color = colors[Math.floor(Math.random()*2)]; // 
        trial.description=description[trial.option]; //create description of the betting options
            if (trial.option=="singlebet"){trial.description=trial.description.replace('{C1}', trial.color).replace('{C2}', trial.color)};//replace color with picked trial color
        trial.polarbutton=polarbutton.replace('{C1}', trial.color).replace('{C2}', trial.color); //replace color in the button with the polar qud
        trial.shortExpression = expressions.shift();//pick a previously unselected expression
        trial.expression = longExpressions[trial.shortExpression]; 
        trial.message = message.replace('{E}', trial.expression).replace('{C1}', trial.color);//create message displayed to participant
        trial.betbutton=betbuttons[trial.option];//create buttons with the betting options
            if (trial.option=="singlebet"){trial.betbutton=trial.betbutton.replace('{C1}', trial.color).replace('{C2}', trial.color).replace('{C3}', trial.color).replace('{C4}', trial.color)};//replace focal color
        trial.senderpic = senderpic.replace('{E}', trial.shortExpression).replace('{C}', trial.color);
        trial.v=w; //used to count the trials
        trial.percentage = (100*trial.v)/howmany //we display progress to the participant as %
        trial.qud="nomatter"; //placeholder assignments to variables which dont play any role in these trials
        trial.scenario="nomatter";
        trial.value="nomatter";  

        return trial;
    });

    console.log(res);//I don't know why this is here

    return res;
    
}


module.exports = setupTrainings;
