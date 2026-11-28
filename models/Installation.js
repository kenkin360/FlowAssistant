var Installation=Function.extend(Object, function () {
	var _=this(Installation);
	Installation=_[Installation];
	function Installation(name, previousGlobal, previousModule, previousSource) {
		_['base'].apply(this, arguments);
		this.Name=name??'';
		this.PreviousGlobal=previousGlobal??null;
		this.PreviousModule=previousModule??null;
		this.PreviousSource=previousSource??null;
	}
	_['public'].Name='';
	_['public'].PreviousGlobal=null;
	_['public'].PreviousModule=null;
	_['public'].PreviousSource=null;
});
