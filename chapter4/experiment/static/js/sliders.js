function sliderLabel(i) {
  return 'slider' + i.toString();
}

var responses = [];
var nResponses = 0;


function resetRadio() {
  $('#radios').children().children().prop('checked', false);
}

function resetSlider() {
  // gets called on after each item
  _.each($('.slider'), function(slider) {
    $(slider).slider('option', 'value', 0.5);
    $(slider).css({ 'background': '', 'border-color': '' });
  });

  responses = [];
  nResponses = 0;
}


function changeCreator(i) {
  return function(value) {
        $('#' + sliderLabel(i)).css({"background":"#99D6EB"});
        $('#' + sliderLabel(i) + ' .ui-slider-handle').css({
          "background":"#667D94",
          "border-color": "#001F29"
        });

        if (responses[i] === undefined) {
          responses[i] = 1;
          nResponses += 1;
        }
  };
}


function slideCreator(i) {
  return function() {
    $('#' + sliderLabel(i) + ' .ui-slider-handle').css({
           "background":"#E0F5FF",
           "border-color": "#001F29"
    });
  };
}


function insertBins(nbins, toclone) {
  var i = 0;
  //var toclone = $('#bin-toclone');

  while (nbins--) {
    var clone = toclone.clone();
    clone.attr('id', 'bin' + nbins);
    clone.insertAfter($('#bin-after'));
  }
}


function insertSliders(nbins, toclone) {
  // clone the slider that is in the item.html file
  // *nbins* times and then remove the slider that is in item.html
  var i = 0;
  //var toclone = $('.toclone');

  while (nbins--) {
    var clone = toclone.clone();
    
    clone.children().attr('id', 'slider' + nbins);
    clone.insertAfter($('#slider-after'));
  }
}


function insertRadio() {
  // clone the bins, change the html of the respective elements
  // to radio input elements; insert it before the bins
  var i = -1;
  var input = '<input type="radio" name="answer" />';
  var el = $('#bins').clone();
  $(el).attr('id', 'radios');
  
  $(el).children().html(input).attr('id', function() {
    return 'radio' + i++;
  });

  $(el).insertBefore($('#bins'));
  $('#radios > td[width="150"]').children().attr('type', 'hidden');
}


function createSliders(nbins) {
  var i;
  var attr = {
      "width":"12px",
      "height":"360px",
      "position":"relative",
      "margin":"5px"
  };

  for (i = 0; i < nbins; i++) {
    var label = sliderLabel(i);
    $('#' + label).attr(attr);
    $('#' + label + ' .ui-slider-handle').attr({"background": "#FAFAFA"});
    $('#' + label).slider({
      animate: true,
      orientation: "vertical",
      max: 1 , min: 0, step: 0.01, value: 0.5,
      slide: slideCreator(i),
      change: changeCreator(i)
    });
  }
}
