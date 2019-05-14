"use strict";

const utilities = require("extra-utilities");
const Jimp = require("jimp");
const Tile = require("./tile.js");

// TODO: temp:
utilities.stringEqualsIgnoreCase = function stringEqualsIgnoreCase(valueA, valueB) {
	if(typeof valueA !== "string" || typeof valueB !== "string") {
		return false;
	}

	return valueA.localeCompare(valueB, undefined, { sensitivity: "accent" }) === 0;
};

class TileFileTypeProperties {
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

class TileFileType {
	constructor(id, name, extension, mimeType) {
		if(typeof id === "string") {
			mimeType = extension;
			extension = name;
			name = id;
			id = NaN;
		}

		let self = this;

		let _properties = {
			id: NaN
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

		Object.defineProperty(self, "extension", {
			enumerable: true,
			get() {
				return _properties.extension;
			},
			set(value) {
				let extension = utilities.trimString(value);

				if(utilities.isNonEmptyString(extension)) {
					extension = extension.toUpperCase();
				}

				_properties.extension = extension;
			}
		});

		Object.defineProperty(self, "mimeType", {
			enumerable: true,
			get() {
				return _properties.mimeType;
			},
			set(value) {
				_properties.mimeType = utilities.trimString(value);
			}
		});

		self.id = id;
		self.name = name;
		self.extension = extension;
		self.mimeType = mimeType;

		if(isNaN(self.id)) {
			_properties.id = TileFileType.idCounter++;
		}
	}

	static getFileType(value) {
		if(TileFileType.isTileFileType(value)) {
			for(let i = 0; i < TileFileType.FileTypes.length; i++) {
				if(TileFileType.FileTypes[i] === value) {
					return TileFileType.FileTypes[i];
				}

				return TileFileType.Invalid;
			}
		}
		else if(typeof value === "string") {
			const formattedValue = utilities.trimString(value);

			for(let i = 0; i < TileFileType.FileTypes.length; i++) {
				const fileType = TileFileType.FileTypes[i];
				const id = utilities.parseInteger(formattedValue);

				if(fileType.id === id ||
				   utilities.stringEqualsIgnoreCase(fileType.name, formattedValue) ||
				   utilities.stringEqualsIgnoreCase(fileType.extension, formattedValue) ||
				   utilities.stringEqualsIgnoreCase(fileType.mimeType, formattedValue)) {
					return fileType;
				}
			}

			return TileFileType.Invalid;
		}
		else if(Number.isInteger(value)) {
			for(let i = 0; i < TileFileType.FileTypes.length; i++) {
				if(TileFileType.FileTypes[i].id === value) {
					return TileFileType.FileTypes[i];
				}
			}

			return TileFileType.Invalid;
		}

		return TileFileType.Invalid;
	}

	equals(value) {
		let self = this;

		if(!self.isValid() || !TileFileType.isValid(value)) {
			return false;
		}

		return utilities.stringEqualsIgnoreCase(self.name, value.name) &&
			   utilities.stringEqualsIgnoreCase(self.extension, value.extension);
	}

	toString() {
		let self = this;

		return self.name + " Tile File Type (" + self.extension + ")";
	}

	static isTileFileType(value) {
		return value instanceof TileFileType;
	}

	isValid() {
		let self = this;

		return self.id >= 0 &&
			   utilities.isNonEmptyString(self.name) &&
			   utilities.isNonEmptyString(self.extension) &&
			   utilities.isNonEmptyString(self.mimeType);
	}

	static isValid(value) {
		return TileFileType.isTileFileType(value) &&
			   value.isValid();
	}
}

Object.defineProperty(Tile, "FileType", {
	value: TileFileType,
	enumerable: true
});

Object.defineProperty(TileFileType, "properties", {
	value: new TileFileTypeProperties(),
	enumerable: false
});

Object.defineProperty(TileFileType, "idCounter", {
	enumerable: true,
	get() {
		return TileFileType.properties.idCounter;
	},
	set(value) {
		TileFileType.properties.idCounter = value;
	}
});

Object.defineProperty(TileFileType, "Invalid", {
	value: new TileFileType(
		-1,
		"Invalid"
	),
	enumerable: true
});

Object.defineProperty(TileFileType, "PNG", {
	value: new TileFileType(
		"Portable Network Graphics",
		"PNG",
		Jimp.MIME_PNG
	),
	enumerable: true
});

Object.defineProperty(TileFileType, "GIF", {
	value: new TileFileType(
		"Graphics Interchange Format",
		"GIF",
		Jimp.MIME_GIF
	),
	enumerable: true
});

Object.defineProperty(TileFileType, "BMP", {
	value: new TileFileType(
		"Bitmap",
		"BMP",
		Jimp.MIME_BMP
	),
	enumerable: true
});

Object.defineProperty(TileFileType, "FileTypes", {
	value: [
		TileFileType.PNG,
		TileFileType.GIF,
		TileFileType.BMP
	],
	enumerable: true
});

module.exports = TileFileType;
