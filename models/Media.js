var Media=Function.extend(Object, function () {
	var _=this(Media);
	Media=_[Media];

	function Media(value) {
		_['base'].apply(this, arguments);
		this.Id=value.id??`media_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		this.MimeType=value.mimeType??this.MimeType;
		this.Title=value.title??null;
		this.MediaId=value.mediaId??null;
		if (value.data instanceof Blob) this.Data=value.data;
		else if (value.base64) {
			let binary=atob(value.base64);
			let bytes=new Uint8Array(binary.length);
			for (let i=0; i<binary.length; i++) bytes[i]=binary.charCodeAt(i);
			this.Data=new Blob([bytes], {type: this.MimeType});
		}
		else this.Data=null;
	}
	Media.From=function (value) {
		if (!value||value instanceof Media) return value;
		if ('string'!==typeof value.mimeType||!value.mimeType) throw new Error('Media needs a MIME type.');
		if (/^video\//.test(value.mimeType)) return new Media.Video(value);
		if (/^image\//.test(value.mimeType)) return new Media.Image(value);
		return new Media(value);
	};
	_['public'].ToBase64=async function () {
		if (!this.Data) throw new Error('Media content is unavailable.');
		let bytes=new Uint8Array(await this.Data.arrayBuffer());
		let parts=[];
		for (let i=0; i<bytes.length; i+=32768) parts.push(String.fromCharCode(...bytes.subarray(i, i+32768)));
		return btoa(parts.join(''));
	};
	_['public'].toJSON=function () { return {id: this.Id, mimeType: this.MimeType, title: this.Title, mediaId: this.MediaId}; };
	_['public'].Id=null;
	_['public'].MimeType='application/octet-stream';
	_['public'].Data=null;
	_['public'].Title=null;
	_['public'].MediaId=null;

	var Image=Function.extend(Media, function () {
		var _=this(Image);
		Image=_[Image];
		function Image(value) {
			_['base'].apply(this, arguments);
			this.Width=value.width??null;
			this.Height=value.height??null;
		}
		_['public'].Width=null;
		_['public'].Height=null;
		_['public'].toJSON=function () {
			return {id: this.Id, mimeType: this.MimeType, title: this.Title, mediaId: this.MediaId, width: this.Width, height: this.Height};
		};
	});

	var Video=Function.extend(Media, function () {
		var _=this(Video);
		Video=_[Video];
		function Video(value) {
			_['base'].apply(this, arguments);
			this.DurationSeconds=value.durationSeconds??null;
			this.Resolution=value.resolution??null;
		}
		_['public'].DurationSeconds=null;
		_['public'].Resolution=null;
		_['public'].toJSON=function () {
			return {id: this.Id, mimeType: this.MimeType, title: this.Title, mediaId: this.MediaId, durationSeconds: this.DurationSeconds, resolution: this.Resolution};
		};
	});
	Media.Image=Image;
	Media.Video=Video;
});
