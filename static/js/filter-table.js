

$(document).ready(function(){
	$("#find-patients").on("keyup", function(){
		caseless_query = $(this).val().toLowerCase();

		$("tr.patients").filter(function(){
			$(this).toggle($(this).text().toLowerCase().indexOf(caseless_query) > -1)
  		});
	});
});
