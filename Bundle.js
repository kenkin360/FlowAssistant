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

	Bundle.SourceUrl=function (path) {
		return `https://esm.sh/gh/kenkin360/FlowAssistant/${path}?raw`;
	};

	Bundle.Config=[
		['MainRenderer', Bundle.SourceUrl('MainRenderer.js')]
		, ['MediaRenderer', Bundle.SourceUrl('MediaRenderer.js')]
		, ['ConversationRenderer', Bundle.SourceUrl('ConversationRenderer.js')]
		, ['DebugRenderer', Bundle.SourceUrl('DebugRenderer.js')]
		, ['ConversationMediator', Bundle.SourceUrl('ConversationMediator.js')]
		, ['DisplayText', Bundle.SourceUrl('DisplayText.js')]
		, ['Assistant', Bundle.SourceUrl('Assistant.js')]
		, ['Methods', Bundle.SourceUrl('Methods.js')]
		, ['Conversation', Bundle.SourceUrl('Conversation.js')]
		, ['HtmlNode', 'https://esm.sh/gh/kenkin360/FlowerX/HtmlNode.js?raw']
		, ['Modal', 'https://esm.sh/gh/kenkin360/FlowerX/Modal.js?raw']
		, ['ImageService', Bundle.SourceUrl('ImageService.js')]
		, ['VideoService', Bundle.SourceUrl('VideoService.js')]
		, ['MediaWorkspace', Bundle.SourceUrl('MediaWorkspace.js')]
		, ['Message', Bundle.SourceUrl('models/Message.js')]
		, ['Media', Bundle.SourceUrl('models/Media.js')]
		, ['Modules', Bundle.SourceUrl('Modules.js')]
		, ['Binding', Bundle.SourceUrl('Binding.js')]
		, ['Installation', Bundle.SourceUrl('models/Installation.js')]
		, ['Sources', Bundle.SourceUrl('Sources.js')]
		, ['Source', Bundle.SourceUrl('models/Source.js')]
		, ['ImageGenerationRequest', Bundle.SourceUrl('models/ImageGenerationRequest.js')]
		, ['AssistantResponse', Bundle.SourceUrl('models/AssistantResponse.js')]
		, ['AssistantRequest', Bundle.SourceUrl('models/AssistantRequest.js')]
		, ['Dimensions', Bundle.SourceUrl('models/Dimensions.js')]
		, ['cv', 'https://esm.sh/gh/TechStark/opencv-js/dist/opencv.js?raw', 'Mat']
		, ['conversationTemplate', Bundle.SourceUrl('views/conversation.html.js')]
		, ['mediaTemplate', Bundle.SourceUrl('views/media.html.js')]
		, ['mainTemplate', Bundle.SourceUrl('views/main.html.js')]
		, ['ConsoleCapture', Bundle.SourceUrl('ConsoleCapture.js')]
	];
});

export { Bundle };
