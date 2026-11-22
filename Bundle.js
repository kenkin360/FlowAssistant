import './Function.extend.js';
import { Resource } from './Resource.js';

var Bundle=Function.extend(Function, function () {
	var _=this(Bundle);
	Bundle=_[Bundle];

	function Bundle() {
		_['base'].apply(this, arguments);
	}

	Bundle.Load=async function (onProgress) {
		let loaded={};
		let total=Bundle.Config.length;
		let completed=0;
		for (let i=total; i-->0; ) {
			let [key, url, readyMember]=Bundle.Config[i];
			let progress={Key: key, File: url.split(/[?#]/)[0].split('/').pop(), Completed: completed, Total: total, Value: null, Error: null};
			onProgress?.(progress);
			try {
				let value=await new Resource.Module(key, url, readyMember);
				loaded[key]=value;
				completed++;
				onProgress?.({...progress, Completed: completed, Value: value});
			}
			catch (error) {
				onProgress?.({...progress, Error: error});
				throw error;
			}
		}
		return loaded;
	};

	Bundle.CustomAgent=function (path) {
		return `https://esm.sh/gh/kenkin360/FlowAssistant/${path}?raw`;
	};

	Bundle.Config=[
		['CustomAgent', Bundle.CustomAgent('CustomAgent.js')]
		, ['HtmlNode', 'https://esm.sh/gh/kenkin360/FlowerX/HtmlNode.js?raw']
		, ['ImageService', Bundle.CustomAgent('ImageService.js')]
		, ['VideoService', Bundle.CustomAgent('VideoService.js')]
		, ['AgentState', Bundle.CustomAgent('models/AgentState.js')]
		, ['Message', Bundle.CustomAgent('models/Message.js')]
		, ['Media', Bundle.CustomAgent('models/Media.js')]
		, ['View', Bundle.CustomAgent('View.js')]
		, ['MessageList', Bundle.CustomAgent('MessageList.js')]
		, ['HistoryList', Bundle.CustomAgent('HistoryList.js')]
		, ['Modules', Bundle.CustomAgent('Modules.js')]
		, ['Binding', Bundle.CustomAgent('Binding.js')]
		, ['Installation', Bundle.CustomAgent('models/Installation.js')]
		, ['Sources', Bundle.CustomAgent('Sources.js')]
		, ['Source', Bundle.CustomAgent('models/Source.js')]
		, ['cv', 'https://esm.sh/gh/TechStark/opencv-js/dist/opencv.js?raw', 'Mat']
		, ['agentTemplate', Bundle.CustomAgent('views/agent.html.js')]
	];
});

export { Bundle };
