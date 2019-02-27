
var statusElt = document.getElementById("status");
var transcriptElt = document.getElementById("query");
var parsedQueryElt = document.getElementById("parsedQuery")
var diagnosis = document.getElementById("diagnosis");
var followUpBox = document.getElementById("follow-up-box");
var evidence_list = [];
var followUpChoiceIds = new Map();
var json = null;

function sendVoiceForParsing() {
        console.log("Voice sent for parsing");
}



function sendTextForParsing(){
    console.log("Text sent for parsing");
    parseQueryWithInfermedica(document.getElementById("query").value);
}

function parseQueryWithInfermedica(query) {
    fetch("https://api.infermedica.com/v2/parse", 
            {
                method: "POST",
                headers: {
                        "App-Id": "d3e09271",
                        "App-Key" : "5dcbf505f0b0b032bddc7eeed14f4ac2",
                        "Content-Type": "application/json",
                },
                body: JSON.stringify({"text": query})})
                .then(function(response) {
                      if (response.ok) {
                          return response.json();
                      } else {
                          throw new Error("Could not reach Afermetica's Backend: " + response.statusText);
                      }
                  })
                .then(function(data) {
                      issueDiagnosisQuery(data);
                      parsedQueryElt.value = JSON.stringify(data, undefined, 2); 
                  }).catch(function(error) {
                      console.log("Failed to parse", error);
                  });
}



function issueDiagnosisQuery(symptomJSON) {
    const evidence = []
    for (const item of symptomJSON.mentions) {
      evidence.push({"id": item.id, "choice_id": item.choice_id});
    } 
    evidence_list = evidence;
    console.log("Evidence", evidence);
    console.log(evidence);
    var age = parseInt(document.getElementById("age").value);
    var gender = document.getElementById("gender").value;
    console.log("issueDiagnosisQuery is called");

    fetch("https://api.infermedica.com/v2/diagnosis", {
              method: "POST",
              headers: {
                  "App-Id": "d3e09271",
                  "App-Key" : "5dcbf505f0b0b032bddc7eeed14f4ac2",
                  "Content-Type": "application/json",
              },
              body: JSON.stringify({
                    "sex": gender,
                    "age": age,
                    "evidence" : evidence
              })
            }).then(function(response) {
              if (response.ok) {
                  return response.json();
              } else {
                  throw new Error("Could not reach Afermetica's API: " + response.statusText);
              }
          }).then(function(data) {
              var nextQuestion = formulateFollowUp(data["question"]);
              buildGraph(rankDiseases(data), nextQuestion); 
          }).catch(function(error) {
              console.log(error.message);
});
}

function formulateFollowUp(question){ 
    let nextQuestion = question.text; 
    console.log("nextQuestion", question.items);
    for (const choice of question.items) { 
      nextQuestion += " " + choice.name + ","; 
      followUpChoiceIds.set(choice.name, choice.id); 
    } 
    return nextQuestion + " ..."; 
}


function refineQuery() {
  let  answer_to_follow_up_question = document.getElementById("follow-up").value;
  evidence_list.push({"id": followUpChoiceIds.get(answer_to_follow_up_question), "choice_id": "present"});
    var age = parseInt(document.getElementById("age").value);
    var gender = document.getElementById("gender").value;
    console.log("issueDiagnosisQuery is called");

    fetch("https://api.infermedica.com/v2/diagnosis", {
              method: "POST",
              headers: {
                  "App-Id": "d3e09271",
                  "App-Key" : "5dcbf505f0b0b032bddc7eeed14f4ac2",
                  "Content-Type": "application/json",
              },
              body: JSON.stringify({
                    "sex": gender,
                    "age": age,
                    "evidence" : evidence_list
              })
            }).then(function(response) {
              if (response.ok) {
                  return response.json();
              } else {
                  throw new Error("Could not reach Afermetica's API: " + response.statusText);
              }
          }).then(function(data) {
              var nextQuestion = formulateFollowUp(data["question"]);
              console.log("ASK AGAIN", nextQuestion);
              json = data;
              // shipResultsToDoctor(data);
              buildGraph(rankDiseases(data), nextQuestion); 
          }).catch(function(error) {
              console.log(error.message);
});
}




function shipResultsToDoctor() {
  console.log("Results are being forwarded to doctor");
  $.post("receiver", json, function(){

  });
  event.preventDefault();
}



function rankDiseases(diagnosisResults) {
      const conditions = diagnosisResults["conditions"];
      const likelihoodToDisease = new Map();
      for (const condition of conditions) {
        let likelihood = condition.probability;
        let currentSetOfConditions = null;
        if (!likelihoodToDisease.has(likelihood)) {
            currentSetOfConditions =  [];
        } else {
            currentSetOfConditions = likelihoodToDisease.get(likelihood);
        }
        currentSetOfConditions.push(
              {
                  "name": condition.name, 
                  "common_name": condition.common_name,
              }
        ); 
        likelihoodToDisease.set(likelihood, currentSetOfConditions);
      }
      console.log("likelihoodToDisease", likelihoodToDisease);
      return likelihoodToDisease; 
}

function buildGraph(likelihoodToDisease, nextQuestion) {
      const probabilities = Array.from(likelihoodToDisease.keys());
      probabilities.sort();

      var nodes = new vis.DataSet();
      var edges = new vis.DataSet();
      let identifier = 1;
      for (const p of probabilities) {
        let diseases = likelihoodToDisease.get(p);
        let labels = "";
        let titles = "";
        for (const disease of diseases) {
          labels += " " + disease.name;
          titles += " " + disease.common_name;
        }

        labels +=  ": "  + p;

        nodes.add({
          id: identifier,
          label: labels,
          title: titles,
          shape: "box",
          color: {
            // border: "red",
            highlight: "yellow", 
          },
        }
        );
        identifier++;
      }
      while (identifier >= 2) {
        const sourceNodeId = identifier;
        identifier --;
        const targetNodeId = identifier
        edges.add({from: sourceNodeId , to: targetNodeId});
      }

      var container = diagnosis;
      var data = {
        nodes: nodes,
        edges: edges
      };
      var options = {};
      var network = new vis.Network(container, data, options);
      diagnosis.parentNode.hidden = false;
      let answer_to_follow_up_question = document.getElementById("follow-up");
      answer_to_follow_up_question.placeholder =  nextQuestion;
      followUpBox.hidden = false;
 }



     
// Mock Input: I am abdominal pains, my head is aching so much. I have been vomiting the past 3 days and I am really losing weight

