const fs=require('fs');
const vm=require('vm');
const root=require('path').join(__dirname, '..')+'/';
globalThis.React={Component: function(props){this.props=props;},createElement: (...args)=>args};
globalThis.Flow={generate:{text: async()=>({text:'{"reply":"ok"}'})}};
globalThis.Bundle={CustomAgent: (value)=>value, Config: []};
globalThis.Sources=class { constructor(){} };
globalThis.Modules=class { constructor(){this.runtime={Modules:{Compute:{Run:()=>({message:'42'})}}};} GetRuntime(){return this.runtime;} GetStartup(){return Promise.resolve();} Initialize(){return Promise.resolve();} GetNames(){return [];} GetSources(){return {CompiledNames:()=>[]};} GetVersionCount(){return 0;} DescribeDynamic(){return '';}};
for (const file of ['Function.extend.js','models/Media.js','models/Message.js','models/Conversation.js','models/MediaWorkspace.js','Assistant.js','AgentApplication.js','MainRenderer.js']) {
  vm.runInThisContext(fs.readFileSync(root+file,'utf8'), {filename:file});
}
const app=new AgentApplication([], '');
const image={id:'i1',mimeType:'image/png',data:new Blob(['a'],{type:'image/png'}),title:'One',mediaId:'m1',width:3,height:4};
app.GetMedia().Apply({activeMedia:image,currentMedia:image,history:[image]});
const selected=app.GetMedia().GetActiveMedia();
if (selected!==app.GetMedia().GetCurrentMedia()||selected!==app.GetMedia().History[0]) throw new Error('Media identity duplicated');
app.Reply('done',{attachment:selected});
if (app.GetMessages()[0].Attachment!==selected) throw new Error('Attachment duplicated');
app.ResetConversation();
if (app.GetMessages().length||app.GetMedia().GetActiveMedia()!==selected) throw new Error('Reset affected media');
const parser=new Assistant('zh-TW');
if (parser.ReadResponse('{"reply":"完成"}').reply!=='完成') throw new Error('Reply parse');
if (parser.ReadResponse('bad').Valid!==false) throw new Error('Fallback parse');
if (parser.ReadResponse('{"reply":"", "attemptPlan":[{"action":"hello"}],"localAction":{"name":"hello","arguments":{}}}',true).Valid!==true) throw new Error('Action parse');
(async()=>{
  globalThis.Flow.generate.text=async()=>({text:'{"reply":"ok","suggestedPrompt":"draw a circle","aspectRatio":"1:1"}'});
  const agent=new AgentApplication([], '');
  agent.SetReady(agent.Welcome('en'));
  await agent.Send('Draw a circle');
  if (agent.GetMessages().length!==2||agent.GetMessages()[1].Text!=='ok') throw new Error('Conversation flow');
  if (agent.GetMedia().GetPrompt()!=='draw a circle'||agent.GetMedia().GetRatio()!=='1:1') throw new Error('Feature response');
  if (Object.keys(agent.GetMessages()[1].toJSON()).some(key=>/accum|suggestedPrompt|aspectRatio/i.test(key))) throw new Error('Duplicated message state');
  globalThis.navigator={languages:['zh-TW'],language:'zh-TW'};
  globalThis.window={innerWidth:1200,innerHeight:800};
  globalThis.agentTemplate='<div></div>';
  globalThis.Modal=class {};
  const part=()=>({outerHTML:'<div></div>',remove(){}});
  const appElement={innerHTML:'<header></header>',querySelector: part};
  globalThis.document={createElement:()=>({content:{querySelector: key=>key==='.ca-app'?appElement:{outerHTML:'<style></style>'}}})};
  globalThis.View=class {
    SetRoot(root){this.root=root;}
    GetRoot(){return this.root;}
    GetLocale(){return 'zh';}
    Update(){this.updated=true;}
    Mounted(){return [];}
    Dispose(){}
  };
  const renderer=new MainRenderer({SourceFiles:[],HostSourceUrl:''});
  const rendered=renderer.render();
  if (!rendered) throw new Error('Renderer creation');
  const rootNode={
    getBoundingClientRect:()=>({left:0,top:0,right:1200,width:1200,height:800}),
    querySelector:()=>({offsetHeight:52})
  };
  rendered[1].ref(rootNode);
  renderer.componentDidMount();
  renderer.componentWillUnmount();
  for (const file of ['MessageList.js','HistoryList.js','View.js']) {
    vm.runInThisContext(fs.readFileSync(root+file,'utf8'), {filename:file});
  }
  globalThis.HtmlNode=class {
    constructor(element){this.element=element;}
    GetElement(){return this.element;}
    SetStyle(){}
    SetText(){}
    Show(){}
  };
  const element={
    getAttribute:()=>null,
    querySelectorAll:()=>[],
    classList:{toggle(){}},
    children:[],
    replaceChildren(){},
    querySelector:()=>null
  };
  globalThis.document.createElement=()=>({...element,appendChild(){},setAttribute(){}});
  const view=new View();
  view.SetRoot({querySelector:()=>element,querySelectorAll:()=>[]});
  view.Update(agent.GetMedia(),agent.GetMessages(),false,key=>key,()=>{});
  const result=await agent.RunAction({name:'Compute',arguments:{}},true);
  if (result.message!=='42'||agent.GetMedia().History.length) throw new Error('Generic action flow');
  let calls=0;
  globalThis.Flow.generate.text=async()=>({text:[
    '{"reply":"welcome"}',
    '{"reply":"","attemptPlan":[{"action":"Compute"}],"localAction":{"name":"Compute","arguments":{}}}',
    '{"reply":"The answer is 42."}'
  ][calls++]});
  const workflow=new AgentApplication([], '');
  workflow.SetReady(workflow.Welcome('en'));
  await workflow.Send('What is six times seven?');
  if (calls!==3||workflow.GetMessages().at(-1)?.Text!=='The answer is 42.') throw new Error('Assistant action loop');
  if (workflow.GetMessages().at(-1).Attachment||workflow.GetMedia().History.length) throw new Error('Non-media request became media');
  console.log('Behavior checks passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
