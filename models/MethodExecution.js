var MethodExecution=Function.extend(Object, function () {
	var _=this(MethodExecution);
	MethodExecution=_[MethodExecution];

	function MethodExecution(methodName, result, error) {
		_['base'].apply(this, arguments);
		this.MethodName=methodName??null;
		this.Result=result??null;
		this.Error=error??null;
	}

	_['public'].MethodName=null;
	_['public'].Result=null;
	_['public'].Error=null;
	_['public'].toJSON=function () {
		return {MethodName: this.MethodName, Result: this.Result, Error: this.Error};
	};
});
