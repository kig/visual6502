/*
 Copyright (c) 2010 Brian Silverman, Barry Silverman

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

var ctrace = false;
var traceTheseNodes = [];
var traceTheseTransistors = [];
var loglevel = 0;
var ulist = new Uint16Array(2000);
var ulistLength = 0;
var recalcList = new Uint16Array(2000);
var recalcHash = new Uint8Array(2000);
var emptyArray = new Uint8Array(2000);
var recalcListLength = 0;
var group = new Array();


function recalcNodeList(list){
  var n = list[0];
  recalcHash.set(emptyArray);
  recalcListLength = 0;
  for (ulistLength=0; ulistLength<list.length; ulistLength++) {
    ulist[ulistLength] = list[ulistLength];
  }
  for(var j=0;j<100;j++){		// loop limiter
    if(ulistLength==0) return;
    if(ctrace) {
      var i;
      for(i=0;i<traceTheseNodes.length;i++) {
	if(list.indexOf(traceTheseNodes[i])!=-1) break;
      }
      if((traceTheseNodes.length==0)||(list.indexOf(traceTheseNodes[i])==-1)) {
	console.log('recalcNodeList iteration: ', j, list.length, 'nodes');
      } else {
	console.log('recalcNodeList iteration: ', j, list.length, 'nodes', list);
      }
    }
    for (var k=0; k<ulistLength; k++) {
      recalcListLength = recalcNode(recalcList, recalcListLength, recalcHash, ulist[k]);
    }
    for (ulistLength=0; ulistLength<recalcListLength; ulistLength++) {
      ulist[ulistLength] = recalcList[ulistLength];
    }
    recalcListLength = 0;
    recalcHash.set(emptyArray);
  }
  if(ctrace) console.log(n,'looping...');
}

function recalcNode(rl, rll, rh, node){
  if(node==ngnd) return rll;
  if(node==npwr) return rll;
  var group = getNodeGroup(node);
  var newState = getNodeValue(group);
  if(ctrace && (traceTheseNodes.indexOf(node)!=-1))
    console.log('recalc', node, group);
  var j=0,k=0;
  for (j=0; j<group.length; j++) {
    var n = nodes[group[j]];
    if(n.state==newState) continue;
    n.state = newState;
    if (n.state) {
      for (k=0; k<n.gates.length; k++)
        rll = turnTransistorOn(rl, rll, rh, n.gates[k]);
    } else {
      for (k=0; k<n.gates.length; k++)
        rll = turnTransistorOff(rl, rll, rh, n.gates[k]);
    }
  }
  return rll;
}

function turnTransistorOn(rl, rll, rh, t){
  if(t.on) return rll;
  if(ctrace && (traceTheseTransistors.indexOf(t.name)!=-1))
    console.log(t.name, 'on', t.gate, t.c1, t.c2);
  t.on = true;
  rll = addRecalcNode(rl, rll, rh, t.c1);
  return rll;
}

function turnTransistorOff(rl, rll, rh, t){
  if(!t.on) return rll;
  if(ctrace && (traceTheseTransistors.indexOf(t.name)!=-1))
    console.log(t.name, 'off', t.gate, t.c1, t.c2);
  t.on = false;
  rll = addRecalcNode(rl, rll, rh, t.c1);
  rll = addRecalcNode(rl, rll, rh, t.c2);
  return rll;
}

function addRecalcNode(rl, rll, rh, nn){
  if(nn==ngnd) return rll;
  if(nn==npwr) return rll;
  if(rh[nn] == 1) return rll; 
  rl[rll] = nn;
  rh[nn] = 1;
  return rll+1;
}

function getNodeGroup(i){
  var group = new Array();
  addNodeToGroup(group, i);
  return group;
}

function addNodeToGroup(group, i){
  if(group.indexOf(i) != -1) return;
  group.push(i);
  if(i==ngnd) return;
  if(i==npwr) return;
  var c = nodes[i].c1c2s;
  for (var j=0; j<c.length; j++) {
    var t = c[j];
    if(!t.on) continue;
    var other = t.c1;
    if(t.c1==i) other=t.c2;
    addNodeToGroup(group, other);
  }
}


function getNodeValue(group){
  if(group.indexOf(ngnd) != -1) return false;
  if(group.indexOf(npwr) != -1) return true;
  for(var i=0; i<group.length; i++){
    var nn = group[i];
    var n = nodes[nn];
    if(n.pullup) return true;
    if(n.pulldown) return false;
    if(n.state) return true;
  }
  return false;
}


function isNodeHigh(nn){
	return(nodes[nn].state);
}

function saveString(name, str){
	var request = new XMLHttpRequest();
	request.onreadystatechange=function(){};
	request.open('PUT', 'save.php?name='+name, true);
	request.setRequestHeader('Content-Type', 'text/plain');
	request.send(str);
}

function allNodes(){
	var res = new Array();
	for(var i in nodes) if((i!=npwr)&&(i!=ngnd)) res.push(i);
	return res;
}

function stateString(){
  var res = new Uint8Array(1725);
  for(var i=0;i<1725;i++){
    var n = nodes[i];
    if (n == undefined) res[i] = 120; // 'x'
    else res[i] = n.state ? 104 : 108; // ? 'h' : 'l'
  }
  res[ngnd] = 103; // 'g'
  res[npwr] = 118; // 'v'
  return res;
}

function showState(str){
  var codes = {g: false, h: true, v: true, l: false};
  for(var i=0;i<str.length;i++){
    if(str[i]=='x') continue;
    var state = codes[str[i]];
    nodes[i].state = state;
    var gates = nodes[i].gates;
    gates.forEach(function(t){t.on=state;});
  }
  refresh();
}


function setPd(name){
  var nn = nodenames[name];
  nodes[nn].pullup = false;
  nodes[nn].pulldown = true;
}

function setHigh(name){
  var nn = nodenames[name];
  nodes[nn].pullup = true;
  nodes[nn].pulldown = false;
  recalcNodeList([nn]);
}

function setLow(name){
  var nn = nodenames[name];
  nodes[nn].pullup = false;
  nodes[nn].pulldown = true;
  recalcNodeList([nn]);
}

