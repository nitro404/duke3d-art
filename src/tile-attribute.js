"use strict";

const utilities = require("extra-utilities");
const TileAttributes = require("./tile-attributes.js");

class TileAttribute {
	constructor(name, staticAttributeName, attributeName, size, signed, offset) {
		let self = this;

		let _properties = { };

		Object.defineProperty(self, "name", {
			enumerable: true,
			get() {
				return _properties.name;
			},
			set(value) {
				_properties.name = utilities.trimString(value);
			}
		});

		Object.defineProperty(self, "staticAttributeName", {
			enumerable: true,
			get() {
				return _properties.staticAttributeName;
			},
			set(value) {
				_properties.staticAttributeName = utilities.trimString(value);
			}
		});

		Object.defineProperty(self, "attributeName", {
			enumerable: true,
			get() {
				return _properties.attributeName;
			},
			set(value) {
				_properties.attributeName = utilities.trimString(value);
			}
		});

		Object.defineProperty(self, "size", {
			enumerable: true,
			get() {
				return _properties.size;
			},
			set(value) {
				const newSize = utilities.parseInteger(value);

				if(isNaN(newSize)) {
					throw new Error("Invalid size value: " + value + ", expected valid integer.");
				}

				if(newSize < 1 || newSize > 32) {
					throw new Error("Size value: " + newSize + " is out of range, expected integer value between 1 and 32, inclusively.");
				}

				_properties.size = newSize;
			}
		});

		Object.defineProperty(self, "signed", {
			enumerable: true,
			get() {
				return _properties.signed;
			},
			set(value) {
				_properties.signed = utilities.parseBoolean(value, false);
			}
		});

		Object.defineProperty(self, "offset", {
			enumerable: true,
			get() {
				return _properties.offset;
			},
			set(value) {
				const newOffset = utilities.parseInteger(value);

				if(isNaN(newOffset)) {
					throw new Error("Invalid offset value: " + value + ", expected valid integer.");
				}

				if(newOffset < 0 || newOffset > 31) {
					throw new Error("Offset value: " + newOffset + " is out of range, expected integer value between 1 and 31, inclusively.");
				}

				_properties.offset = newOffset;
			}
		});

		Object.defineProperty(self, "min", {
			enumerable: true,
			get() {
				if(_properties.signed) {
					return -utilities.leftShift(1, _properties.size - 1);
				}
				else {
					return 0;
				}
			}
		});

		Object.defineProperty(self, "max", {
			enumerable: true,
			get() {
				if(_properties.signed) {
					return utilities.leftShift(1, _properties.size - 1) - 1;
				}
				else {
					return utilities.leftShift(1, _properties.size) - 1;
				}
			}
		});

		Object.defineProperty(self, "mask", {
			enumerable: true,
			get() {
				return utilities.leftShift(1, _properties.size) - 1;
			}
		});

		Object.defineProperty(self, "offsetMask", {
			enumerable: true,
			get() {
				return utilities.leftShift(utilities.leftShift(1, _properties.size) - 1, _properties.offset);
			}
		});

		Object.defineProperty(self, "signBitMask", {
			enumerable: true,
			get() {
				return utilities.leftShift(1, _properties.size - 1);
			}
		});

		self.name = name;
		self.staticAttributeName = staticAttributeName;
		self.attributeName = attributeName;
		self.size = size;
		self.signed = signed;
		self.offset = offset;
	}

	static getTileAttribute(value) {
		if(TileAttribute.isTileAttribute(value)) {
			for(let i = 0; i < TileAttribute.Attributes.length; i++) {
				if(TileAttribute.Attributes[i] === value) {
					return TileAttribute.Attributes[i];
				}

				return null;
			}
		}
		else if(typeof value === "string") {
			const formattedValue = utilities.trimString(value);

			for(let i = 0; i < TileAttribute.Attributes.length; i++) {
				const attribute = TileAttribute.Attributes[i];

				if(utilities.stringEqualsIgnoreCase(attribute.name, formattedValue) ||
				   utilities.stringEqualsIgnoreCase(attribute.staticAttributeName, formattedValue) ||
				   utilities.stringEqualsIgnoreCase(attribute.attributeName, formattedValue)) {
					return attribute;
				}
			}

			return null;
		}

		return null;
	}

	equals(value) {
		let self = this;

		return utilities.stringEqualsIgnoreCase(self.name, value.name) &&
			   self.staticAttributeName === value.staticAttributeName &&
			   self.attributeName === value.attributeName &&
			   self.size === value.size &&
			   self.signed === value.signed &&
			   self.offset === value.offset;
	}

	toString() {
		let self = this;

		return self.name + " Tile Attribute (Size: " + self.size + ", Signed: " + self.signed + ", Offset: " + self.offset + ")";
	}

	static isTileAttribute(value) {
		return value instanceof TileAttribute;
	}
}

Object.defineProperty(TileAttribute, "XOffset", {
	value: new TileAttribute("X Offset", "XOffset", "xOffset", 8, true, 12),
	enumerable: true
});

Object.defineProperty(TileAttribute, "YOffset", {
	value: new TileAttribute("Y Offset", "YOffset", "yOffset", 8, true, 20),
	enumerable: true
});

Object.defineProperty(TileAttribute, "NumberOfFrames", {
	value: new TileAttribute("Number of Frames", "NumberOfFrames", "numberOfFrames", 6, false, 4),
	enumerable: true
});

Object.defineProperty(TileAttribute, "AnimationType", {
	value: new TileAttribute("Animation Type", "AnimationType", "animationType", 2, false, 10),
	enumerable: true
});

Object.defineProperty(TileAttribute, "AnimationSpeed", {
	value: new TileAttribute("Animation Speed", "AnimationSpeed", "animationSpeed", 4, false, 28),
	enumerable: true
});

Object.defineProperty(TileAttribute, "Extra", {
	value: new TileAttribute("Extra", "Extra", "extra", 4, false, 0),
	enumerable: true
});

Object.defineProperty(TileAttribute, "Attributes", {
	value: [
		TileAttribute.XOffset,
		TileAttribute.YOffset,
		TileAttribute.NumberOfFrames,
		TileAttribute.AnimationType,
		TileAttribute.AnimationSpeed,
		TileAttribute.Extra
	],
	enumerable: true
});

module.exports = TileAttribute;
