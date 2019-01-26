    $(function() {
    $( "#slider" ).slider({
      range: "max",
      min: 0,
      max: 100,
      value: 50,
      slide: function( event, ui ) {
        $( "#amount" ).val( ui.value );
      }
    });
    $( "#amount" ).val( $( "#slider" ).slider( "value" ) );
  });
    
  $(function() {
    $( "#expression" ).selectmenu();
    
  });    
    
function resetSlider() {
  var $slider = $("#slider");
    $(slider).slider('option', 'value', 50);
    $(amount).val(50);
  };
    
//function resetExpression() {
//  var $epression = $("#expression");
//    $(expression).val(0);
//  };
//  
