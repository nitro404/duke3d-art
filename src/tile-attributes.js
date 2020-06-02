"use strict";

const utilities = require("extra-utilities");
const Tile = require("./tile.js");

class TileAttributes {
	constructor(xOffset, yOffset, numberOfFrames, animationType, animationSpeed, extra) {
		let self = this;

		let _properties = { };

		for(let i = 0; i < TileAttributes.Attribute.Attributes.length; i++) {
			const attribute = TileAttributes.Attribute.Attributes[i];

			Object.defineProperty(self, attribute.attributeName, {
				enumerable: true,
				get() {
					return _properties[attribute.attributeName];
				},
				set(value) {
					const newValue = utilities.parseInteger(value);

					if(isNaN(newValue)) {
						throw new Error("Invalid " + attribute.name + " value: " + value + " expected valid integer value.");
					}

					if(newValue < attribute.min || newValue > attribute.max) {
						throw new Error(attribute.name + " value: " + newValue + " out of range, expected integer value between " + attribute.min + " and " + attribute.max + ", inclusively.");
					}

					_properties[attribute.attributeName] = newValue;
				}
			});
		}

		self.xOffset = xOffset;
		self.yOffset = yOffset;
		self.numberOfFrames = numberOfFrames;
		self.animationType = animationType;
		self.animationSpeed = animationSpeed;
		self.extra = extra; // note: extra value is not used
	}

	getAnimationType() {
		let self = this;

		const animationType = Tile.AnimationType.Types[self.animationType];

		return Tile.AnimationType.isValid(animationType) ? animationType : Tile.AnimationType.Invalid;
	}

	getMetadata() {
		let self = this;

		return {
			offset: {
				x: self.xOffset,
				y: self.yOffset
			},
			numberOfFrames: self.numberOfFrames,
			animation: {
				type: self.getAnimationType().name,
				speed: self.animationSpeed
			},
			extra: self.extra
		};
	}

	pack() {
		let self = this;

		let packedValue = 0;

		for(let i = 0; i < TileAttributes.Attribute.Attributes.length; i++) {
			const attribute = TileAttributes.Attribute.Attributes[i];

			packedValue += utilities.leftShift(self[attribute.attributeName] & attribute.mask, attribute.offset);
		}

		return packedValue;
	}

	static unpack(packedValue) {
		packedValue = utilities.parseInteger(packedValue);

		if(!Number.isInteger(packedValue)) {
			return null;
		}

		let tileAttributes = [];

		for(let i = 0; i < TileAttributes.Attribute.Attributes.length; i++) {
			const attribute = TileAttributes.Attribute.Attributes[i];

			tileAttributes[i] = utilities.rightShift((packedValue & attribute.offsetMask), attribute.offset) & attribute.mask;

			if(attribute.signed) {
				tileAttributes[i] = ((tileAttributes[i] & attribute.signBitMask) === attribute.signBitMask) ? -(attribute.mask - tileAttributes[i] + 1) : tileAttributes[i];
			}
		}

		return new (Function.prototype.bind.apply(TileAttributes, [null].concat(tileAttributes)));
	}

	equals(value) {
		let self = this;

		if(!TileAttributes.isTileAttributes(value)) {
			return false;
		}

		return self.xOffset === value.xOffset &&
			   self.yOffset === value.yOffset &&
			   self.numberOfFrames === value.numberOfFrames &&
			   self.animationType === value.animationType &&
			   self.animationSpeed=== value.animationSpeed;
	}

	toString() {
		let self = this;

		let tileAttributeString = "Tile Attributes (";

		for(let i = 0; i < TileAttributes.Attribute.Attributes.length; i++) {
			const attribute = TileAttributes.Attribute.Attributes[i];

			if(i !== 0) {
				tileAttributeString += ", ";
			}

			tileAttributeString += attribute.name + ": ";

			if(attribute === TileAttributes.AnimationType) {
				tileAttributeString += self.getAnimationType().name;
			}
			else {
				tileAttributeString += self[attribute.attributeName];
			}
		}

		tileAttributeString += ")";

		return tileAttributeString;
	}

	clone() {
		const self = this;

		return new TileAttributes(self.xOffset, self.yOffset, self.numberOfFrames, self.animationType, self.animationSpeed, self.extra);
	}

	static isTileAttributes(value) {
		return value instanceof TileAttributes;
	}
}

module.exports = TileAttributes;
