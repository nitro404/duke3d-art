"use strict";

const utilities = require("extra-utilities");
const Tile = require("./tile.js");

class TileAnimationTypeProperties {
	constructor() {
		let self = this;

		let _properties = {
			idCounter: 0
		};

		Object.defineProperty(self, "idCounter", {
			enumerable: true,
			get() {
				return _properties.idCounter;
			},
			set(value) {
				const newIDCounter = utilities.parseInteger(value);

				if(!isNaN(newIDCounter) && isFinite(newIDCounter) && newIDCounter > _properties.idCounter) {
					_properties.idCounter = newIDCounter;
				}
			}
		});
	}
}

class TileAnimationType {
	constructor(id, name) {
		let self = this;

		if(typeof id === "string") {
			name = id;
			id = NaN;
		}

		let _properties = {
			id: NaN,
			name: null
		};

		Object.defineProperty(self, "id", {
			enumerable: true,
			get() {
				return _properties.id;
			},
			set(value) {
				let newID = utilities.parseInteger(value);

				// only allow negative special values to be set manually
				if(!isNaN(newID) && newID < 0) {
					_properties.id = newID;
				}
			}
		});

		Object.defineProperty(self, "name", {
			enumerable: true,
			get() {
				return _properties.name;
			},
			set(value) {
				_properties.name = utilities.trimString(value);
			}
		});

		self.id = id;
		self.name = name;

		if(isNaN(_properties.id)) {
			_properties.id = TileAnimationType.idCounter++;
		}
	}

	static getAnimationType(value) {
		if(TileAnimationType.isTileAnimationType(value)) {
			for(let i = 0; i < TileAnimationType.Types.length; i++) {
				if(TileAnimationType.Types[i] === value) {
					return TileAnimationType.Types[i];
				}

				return TileAnimationType.Invalid;
			}
		}
		else if(typeof value === "string") {
			const formattedValue = utilities.trimString(value);

			for(let i = 0; i < TileAnimationType.Types.length; i++) {
				const animationType = TileAnimationType.Types[i];
				const id = utilities.parseInteger(formattedValue);

				if(animationType.id === id ||
				   utilities.stringEqualsIgnoreCase(animationType.name, formattedValue)) {
					return animationType;
				}
			}

			return TileAnimationType.Invalid;
		}
		else if(Number.isInteger(value)) {
			for(let i = 0; i < TileAnimationType.Types.length; i++) {
				if(TileAnimationType.Types[i].id === value) {
					return TileAnimationType.Types[i];
				}
			}

			return TileAnimationType.Invalid;
		}

		return TileAnimationType.Invalid;
	}

	equals(value) {
		let self = this;

		if(!self.isValid() || !TileAnimationType.isValid(value)) {
			return false;
		}

		return utilities.stringEqualsIgnoreCase(self.name, value.name);
	}

	toString() {
		let self = this;

		return self.name;
	}

	static isTileAnimationType(value) {
		return value instanceof TileAnimationType;
	}

	isValid() {
		let self = this;

		return self.id >= 0 &&
			   utilities.isNonEmptyString(self.name);
	}

	static isValid(value) {
		return TileAnimationType.isTileAnimationType(value) &&
			   value.isValid();
	}
}

Object.defineProperty(Tile, "AnimationType", {
	value: TileAnimationType,
	enumerable: true
});

Object.defineProperty(TileAnimationType, "properties", {
	value: new TileAnimationTypeProperties(),
	enumerable: false
});

Object.defineProperty(TileAnimationType, "idCounter", {
	enumerable: true,
	get() {
		return TileAnimationType.properties.idCounter;
	},
	set(value) {
		TileAnimationType.properties.idCounter = value;
	}
});

Object.defineProperty(TileAnimationType, "Invalid", {
	value: new TileAnimationType(-1, "Invalid"),
	enumerable: true
});

Object.defineProperty(TileAnimationType, "None", {
	value: new TileAnimationType("None"),
	enumerable: true
});

Object.defineProperty(TileAnimationType, "Oscillating", {
	value: new TileAnimationType("Oscillating"),
	enumerable: true
});

Object.defineProperty(TileAnimationType, "Forward", {
	value: new TileAnimationType("Forward"),
	enumerable: true
});

Object.defineProperty(TileAnimationType, "Backward", {
	value: new TileAnimationType("Backward"),
	enumerable: true
});

Object.defineProperty(TileAnimationType, "Default", {
	value: TileAnimationType.None,
	enumerable: true
});

Object.defineProperty(TileAnimationType, "Types", {
	value: [
		TileAnimationType.None,
		TileAnimationType.Oscillating,
		TileAnimationType.Forward,
		TileAnimationType.Backward
	],
	enumerable: true
});

module.exports = TileAnimationType;
