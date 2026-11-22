var Message=Function.extend(Object, function () {
	var _=this(Message);
	Message=_[Message];
	function Message(value={}) {
		_['base'].apply(this, arguments);
		this.Id=value.id;
		this.Sender=value.sender;
		this.Text=value.text;
		this.Timestamp=value.timestamp;
		this.IncludedMedia=Media.From(value.includedMedia);
		this.SuggestedPrompt=value.suggestedPrompt;
		this.AspectRatio=value.aspectRatio;
		this.AccumulatedChanges=value.accumulatedChanges?.slice();
	}
	_['public'].toJSON=function () {
		return {id: this.Id, sender: this.Sender, text: this.Text, timestamp: this.Timestamp, includedMedia: this.IncludedMedia?{...this.IncludedMedia.toJSON(), data: this.IncludedMedia.Data}:undefined, suggestedPrompt: this.SuggestedPrompt, aspectRatio: this.AspectRatio, accumulatedChanges: this.AccumulatedChanges?.slice()};
	};
	_['public'].Id=null;
	_['public'].Sender=null;
	_['public'].Text=null;
	_['public'].Timestamp=null;
	_['public'].IncludedMedia=null;
	_['public'].SuggestedPrompt=null;
	_['public'].AspectRatio=null;
	_['public'].AccumulatedChanges=null;
});
