"use strict";

// TODO: temp
// http://www.shikadi.net/moddingwiki/Duke_Nukem_3D
// http://www.shikadi.net/moddingwiki/ART_Format_(Build)
// https://fabiensanglard.net/duke3d/BUILDINF.TXT

const async = require("async");
const path = require("path-extra");
const fs = require("fs-extra");
const utilities = require("extra-utilities");
const jsonFormat = require("json-format");
const ByteBuffer = require("bytebuffer");
const Colour = require("colour-rgba");
const Palette = require("duke3d-palette");
const Tile = require("./tile.js");

class ArtProperties {
	constructor() {
		let self = this;

		let _properties = {
			verbose: true,
			metadataFileExtension: Art.DefaultMetadataFileExtension
		};

		Object.defineProperty(self, "verbose", {
			enumerable: true,
			get() {
				return _properties.verbose;
			},
			set(value) {
				_properties.verbose = utilities.parseBoolean(value, false);
			}
		});

		Object.defineProperty(self, "metadataFileExtension", {
			enumerable: true,
			get() {
				return _properties.metadataFileExtension;
			},
			set(value) {
				let newValue = utilities.trimString(value);

				if(utilities.isEmptyString(newValue)) {
					throw new Error("Invalid metadata file extension, expected non-empty string.");
				}

				_properties.metadataFileExtension = newValue;
			}
		});
	}
}

class Art {
	constructor(legacyTileCount, localTileStart, localTileEnd, tiles, filePath) {
		let self = this;

		let _properties = {
			tiles: []
		};

		Object.defineProperty(self, "number", {
			get() {
				return Math.floor(_properties.localTileStart / Art.DefaultNumberOfTiles);
			}
		});

		Object.defineProperty(self, "localTileStart", {
			enumerable: true,
			get() {
				return _properties.localTileStart;
			},
			set(value) {
				const newValue = utilities.parseInteger(value);

				if(isNaN(newValue) || newValue < 0) {
					throw new TypeError("Invalid local tile start value: " + value + ", expected positive integer.");
				}

				_properties.localTileStart = localTileStart;
			}
		});

		Object.defineProperty(self, "localTileEnd", {
			enumerable: true,
			get() {
				return _properties.localTileEnd;
			},
			set(value) {
				const newValue = utilities.parseInteger(value);

				if(isNaN(newValue) || newValue < 0) {
					throw new TypeError("Invalid local tile end value: " + value + ", expected positive integer.");
				}

				_properties.localTileEnd = localTileEnd;
			}
		});

		// note: this field is no longer used and is inaccurate
		Object.defineProperty(self, "legacyTileCount", {
			enumerable: true,
			get() {
				return _properties.legacyTileCount;
			},
			set(value) {
				const newValue = utilities.parseInteger(value);

				if(isNaN(newValue) || newValue < 0) {
					throw new TypeError("Invalid tile count value: " + value + ", expected positive integer.");
				}

				_properties.legacyTileCount = newValue;
			}
		});

		Object.defineProperty(self, "filePath", {
			enumerable: true,
			get() {
				return _properties.filePath;
			},
			set(filePath) {
				_properties.filePath = utilities.trimString(filePath);
			}
		});

		Object.defineProperty(self, "tiles", {
			enumerable: true,
			get() {
				return _properties.tiles;
			},
			set(value) {
				if(utilities.isNonEmptyArray(value)) {
					for(let i = 0; i < value.length; i++) {
						if(!Art.Tile.isTile(value[i])) {
							throw new TypeError("Invalid tile in tile list at index " + i + ".");
						}
					}

					_properties.tiles.length = 0;
					Array.prototype.push.apply(_properties.tiles, value);
				}
			}
		});

		Object.defineProperty(self, "data", {
			enumerable: true,
			get() {
				return self.serialize();
			}
		});

		self.legacyTileCount = legacyTileCount;
		self.localTileStart = localTileStart;
		self.localTileEnd = localTileEnd;
		self.tiles = tiles;
		self.filePath = filePath;
	}

	static isExtendedBy(artSubclass) {
		if(artSubclass instanceof Object) {
			return false;
		}

		let artSubclassPrototype = null;

		if(artSubclass instanceof Function) {
			artSubclassPrototype = artSubclass.prototype;
		}
		else {
			artSubclassPrototype = artSubclass.constructor.prototype;
		}

		return artSubclassPrototype instanceof Art;
	}

	create(tileStartOffset, numberOfTiles) {
		const formattedTileStartOffset = utilities.parseInteger(tileStartOffset);

		if(isNaN(formattedTileStartOffset) || formattedTileStartOffset < 0) {
			formattedTileStartOffset = 0;
		}

		const formattedNumberOfTiles = utilities.parseInteger(numberOfTiles);

		if(isNaN(formattedNumberOfTiles) || formattedNumberOfTiles < 0) {
			formattedNumberOfTiles = Art.DefaultNumberOfTiles;
		}

		let tiles = [];

		for(let i = 0; i < formattedNumberOfTiles; i++) {
			tiles.push(new Art.Tile(formattedTileStartOffset + i, 0, 0, null, 0));
		}

		return new Art(0, formattedTileStartOffset, formattedTileStartOffset + formattedNumberOfTiles - 1, tiles);
	}

	getFileName() {
		let self = this;

		if(utilities.isEmptyString(self.filePath)) {
			return null;
		}

		return utilities.getFileName(self.filePath);
	}

	getExtension() {
		let self = this;

		return utilities.getFileExtension(self.filePath);
	}

	numberOfNonEmptyTiles() {
		let self = this;

		let tileCount = 0;

		for(let i = 0; i < self.tiles.length; i++) {
			if(!self.tiles[i].isEmpty()) {
				tileCount++;
			}
		}

		return tileCount;
	}

	numberOfEmptyTiles() {
		let self = this;

		let tileCount = 0;

		for(let i = 0; i < self.tiles.length; i++) {
			if(self.tiles[i].isEmpty()) {
				tileCount++;
			}
		}

		return tileCount;
	}

	getTileByNumber(tileNumber) {
		let self = this;

		tileNumber = utilities.parseInteger(tileNumber);

		if(isNaN(tileNumber)) {
			throw new Error("Invalid tile number: " + tileNumber + ", expected valid integer value.");
		}

		const tileIndex = tileNumber - self.localTileStart;

		if(tileIndex < 0 || tileIndex >= self.tiles.length) {
			throw new Error("Tile number " + tileNumber + " is out of range, expected integer number between " + self.localTileStart + " and " + self.localTileEnd + ", inclusively.");
		}

		return self.tiles[tileIndex];
	}

	replaceTile(tile, tileNumber) {
		const self = this;

		if(!Art.Tile.isTile(tile)) {
			throw new Error("Cannot replace tile with invalid value!");
		}

		tileNumber = utilities.parseInteger(tileNumber);

		if(isNaN(tileNumber)) {
			tileNumber = tile.number;
		}

		const tileIndex = tileNumber - self.localTileStart;

		if(tileIndex < 0 || tileIndex >= self.tiles.length) {
			throw new Error(`Cannot replace tile #${tileNumber}, number must be within range of ${self.localTileStart} and ${self.localTileEnd}`);
		}

		const newTile = tile.clone();
		newTile.number = tileNumber;

		self.tiles[tileIndex] = newTile;
	}

	clearTile(tileNumber) {
		const self = this;

		tileNumber = utilities.parseInteger(tileNumber);

		if(isNaN(tileNumber)) {
			throw new Error("Invalid tile number: " + tileNumber + ", expected valid integer value.");
		}

		const tileIndex = tileNumber - self.localTileStart;

		if(tileIndex < 0 || tileIndex >= self.tiles.length) {
			throw new Error("Tile number " + tileNumber + " is out of range, expected integer number between " + self.localTileStart + " and " + self.localTileEnd + ", inclusively.");
		}

		self.tiles[tileIndex].clear();
	}

	getTiles(includeEmpty) {
		let self = this;

		includeEmpty = utilities.parseBoolean(includeEmpty, false);

		let tiles = [];

		for(let i = 0; i < self.tiles.length; i++) {
			if(self.tiles[i].isEmpty() && !includeEmpty) {
				continue;
			}

			tiles.push(self.tiles[i]);
		}

		return tiles;
	}

	getNonEmptyTiles() {
		let self = this;

		let tiles = [];

		for(let i = 0; i < self.tiles.length; i++) {
			if(!self.tiles[i].isEmpty()) {
				tiles.push(self.tiles[i]);
			}
		}

		return tiles;
	}

	getEmptyTiles() {
		let self = this;

		let tiles = [];

		for(let i = 0; i < self.tiles.length; i++) {
			if(self.tiles[i].isEmpty()) {
				tiles.push(self.tiles[i]);
			}
		}

		return tiles;
	}

	compareTo(artFile) {
		const self = this;

		if(!Art.isArt(artFile)) {
			throw new Error("Cannot compare to invalid art file!");
		}

		const tileComparison = {
			new: [],
			modified: [],
			removed: [],
			attributesChanged: []
		};

		for(let i = 0; i < self.tiles.length; i++) {
			const tileA = self.tiles[i];
			const tileB = artFile.getTileByNumber(tileA.number);
			const tileAEmpty = tileA.isEmpty();
			const tileBEmpty = tileB.isEmpty();

			if(tileAEmpty && !tileBEmpty) {
				tileComparison.new.push(tileB);
			}
			else if(!tileAEmpty && tileBEmpty) {
				tileComparison.removed.push(tileA);
			}
			else if(!tileA.data.equals(tileB.data)) {
				tileComparison.modified.push(tileB);
			}
			else if(!tileA.attributes.equals(tileB.attributes)) {
				tileComparison.attributesChanged.push(tileB);
			}
		}

		return tileComparison;
	}

	getMetadata() {
		let self = this;

		let metadata = {
			number: self.number,
			count: self.legacyTileCount,
			start: self.localTileStart,
			end: self.localTileEnd,
			tiles: []
		};

		for(let i = 0; i < self.tiles.length; i++) {
			metadata.tiles.push(self.tiles[i].getMetadata());
		}

		return metadata;
	}

	static formatMetadata(metadata) {
		return utilities.formatValue(metadata, Art.MetadataFormat);
	}

	writeMetadata(filePath, overwrite, minify, fileName) {
		let self = this;

		overwrite = utilities.parseBoolean(overwrite, false);
		minify = utilities.parseBoolean(minify, false);

		if(utilities.isEmptyString(fileName)) {
			fileName = utilities.getFileName(filePath);

			if(utilities.isEmptyString(fileName)) {
				fileName = "TILES" + utilities.addLeadingZeroes(self.number, 3) + "." + Art.metadataFileExtension;
			}
		}

		const outputDirectory = utilities.getFilePath(filePath);
		const outputFilePath = utilities.joinPaths(outputDirectory, fileName);

		if(utilities.isNonEmptyString(outputDirectory)) {
			fs.ensureDirSync(outputDirectory);
		}

		const metadata = self.getMetadata();

		fs.writeFileSync(outputFilePath, minify ? JSON.stringify(metadata) : jsonFormat(metadata));

		return outputFilePath;
	}

	static readMetadata(filePath) {
		let self = this;

		return Art.formatMetadata(JSON.parse(fs.readFileSync(filePath)));
	}

	applyMetadata(metadata) {
		const formattedMetadata = Art.formatMetadata(metadata);

// TODO: apply metadata
	}

	extractTileAtIndex(index, filePath, overwrite, palette, fileType, fileName, writeMetadata, minifyMetadata, callback) {
		let self = this;

		if(utilities.isFunction(writeMetadata)) {
			callback = writeMetadata;
			writeMetadata = true;
			minifyMetadata = null;
		}
		else if(utilities.isFunction(minifyMetadata)) {
			callback = minifyMetadata;
			minifyMetadata = null;
		}

		if(!utilities.isFunction(callback)) {
			throw new Error("Missing or invalid callback function!");
		}

		writeMetadata = utilities.parseBoolean(writeMetadata, true);

		const formattedIndex = utilities.parseInteger(index);

		if(isNaN(formattedIndex)) {
			return callback(new Error("Invalid tile index: " + index));
		}

		if(formattedIndex < 0 || formattedIndex >= self.tiles.length) {
			return callback(new Error("Tile index " + formattedIndex + " is out of range, expected value between 0 and " + (self.tiles.length - 1) + ", inclusively."))
		}

		if(writeMetadata) {
			try {
				self.writeMetadata(
					utilities.getFilePath(filePath) + "/",
					overwrite,
					minifyMetadata
				);
			}
			catch(error) {
				return callback(error);
			}
		}

		return self.tiles[formattedIndex].writeTo(
			filePath,
			overwrite,
			palette,
			fileType,
			fileName,
			function(error, filePath) {
				if(error) {
					return callback(error);
				}

				return callback(null, filePath, metadataFilePath);
			}
		);
	}

	extractTileByNumber(number, filePath, overwrite, palette, fileType, fileName, writeMetadata, minifyMetadata, callback) {
		let self = this;

		if(utilities.isFunction(writeMetadata)) {
			callback = writeMetadata;
			writeMetadata = true;
			minifyMetadata = null;
		}
		else if(utilities.isFunction(minifyMetadata)) {
			callback = minifyMetadata;
			minifyMetadata = null;
		}

		if(!utilities.isFunction(callback)) {
			throw new Error("Missing or invalid callback function!");
		}

		const formattedNumber = utilities.parseInteger(number);

		if(isNaN(formattedNumber)) {
			return callback(new Error("Invalid tile number: " + number));
		}

		const tileIndex = formattedNumber - self.localTileStart;

		if(tileIndex < 0 || tileIndex >= self.tiles.length) {
			return callback(new Error("Tile number " + formattedNumber + " is out of range, expected value between " + self.localTileStart + " and " + self.localTileEnd + ", inclusively."))
		}

		return self.extractTileAtIndex(tileIndex, filePath, overwrite, palette, fileType, fileName, writeMetadata, callback);
	}

	extractAllTiles(outputDirectory, overwrite, palette, fileType, writeMetadata, minifyMetadata, includeEmpty, callback) {
		let self = this;

		if(utilities.isFunction(writeMetadata)) {
			callback = writeMetadata;
			includeEmpty = false;
			minifyMetadata = null;
			writeMetadata = true;
		}
		else if(utilities.isFunction(minifyMetadata)) {
			callback = minifyMetadata;
			includeEmpty = false;
			minifyMetadata = null;
		}
		else if(utilities.isFunction(includeEmpty)) {
			callback = includeEmpty;
			includeEmpty = false;
		}

		if(!utilities.isFunction(callback)) {
			throw new Error("Missing or invalid callback function!");
		}

		return async.waterfall(
			[
				function(callback) {
					if(!writeMetadata) {
						return callback(null, null);
					}

					try {
						const metadataFilePath = self.writeMetadata(
							utilities.getFilePath(outputDirectory) + "/",
							overwrite,
							minifyMetadata
						);

						if(Art.verbose) {
							console.log("Saved ART file #" + self.number + " metadata to file: " + metadataFilePath);
						}

						return callback(null, metadataFilePath);
					}
					catch(error) {
						return callback(error);
					}
				},
				function(metadataFilePath, callback) {
					return async.concatSeries(
						self.getTiles(includeEmpty),
						function(tile, callback) {
							return tile.writeTo(
								outputDirectory,
								overwrite,
								palette,
								fileType,
								function(error, filePath) {
									if(error) {
										return callback(error);
									}

									if(Art.verbose) {
										console.log("Saved tile #" + tile.number + " image to file: " + filePath);
									}

									return callback(null, filePath);
								}
							);
						},
						function(error, filePaths) {
							if(error) {
								return callback(error);
							}

							if(Art.verbose) {
								console.log("Saved " + filePaths.length + " tile images from ART file #" + self.number + " to files at: " + outputDirectory);
							}

							return callback(null, filePaths, metadataFilePath);
						}
					);
				},
			],
			function(error, filePaths, metadataFilePath) {
				if(error) {
					return callback(error);
				}

				return callback(null, filePaths, metadataFilePath);
			}
		);
	}

	getSize() {
		let self = this;

		let size = Art.HeaderSize + (self.tiles.length * 8);

		for(let i = 0; i < self.tiles.length; i++) {
			size += self.tiles[i].getSize();
		}

		return size;
	}

	serialize() {
		let self = this;

		let artByteBuffer = new ByteBuffer(self.getSize());
		artByteBuffer.order(true);

		artByteBuffer.writeInt32(Art.Version);
		artByteBuffer.writeInt32(self.legacyTileCount)
		artByteBuffer.writeInt32(self.localTileStart)
		artByteBuffer.writeInt32(self.localTileEnd);

		for(let i = 0; i < self.tiles.length; i++) {
			artByteBuffer.writeInt16(self.tiles[i].width);
		}

		for(let i = 0; i < self.tiles.length; i++) {
			artByteBuffer.writeInt16(self.tiles[i].height);
		}

		for(let i = 0; i < self.tiles.length; i++) {
			artByteBuffer.writeInt32(self.tiles[i].attributes.pack());
		}

		for(let i = 0; i < self.tiles.length; i++) {
			artByteBuffer.append(self.tiles[i].data);
		}

		artByteBuffer.flip();

		return artByteBuffer.toBuffer();
	}

	static deserialize(data) {
		let self = this;

		if(!Buffer.isBuffer(data)) {
			throw new Error("Invalid data, expected buffer.");
		}

		let artByteBuffer = new ByteBuffer();
		artByteBuffer.order(true);
		artByteBuffer.append(data, "binary");
		artByteBuffer.flip();

		if(artByteBuffer.remaining() < Art.HeaderSize) {
			throw new Error("Art file corrupted or invalid, missing full header data.");
		}

		const version = artByteBuffer.readInt32();

		if(!Number.isInteger(version)) {
			throw new Error("Invalid ART file version: " + version + ", expected a value of " + Art.Version + ".");
		}

		if(version !== Art.Version) {
			throw new Error("Unsupported ART file version: " + newValue + ", only version " + Art.Version + " is supported.");
		}

		const legacyTileCount = artByteBuffer.readInt32();

		if(!Number.isInteger(legacyTileCount) || legacyTileCount < 0) {
			throw new Error("Invalid tile count value: " + legacyTileCount + ", expected positive integer.");
		}

		const localTileStart = artByteBuffer.readInt32();

		if(!Number.isInteger(localTileStart) || localTileStart < 0) {
			throw new Error("Invalid local tile start value: " + localTileStart + ", expected positive integer.");
		}

		const localTileEnd = artByteBuffer.readInt32();

		if(!Number.isInteger(localTileEnd) || localTileEnd < 0) {
			throw new Error("Invalid local tile end value: " + localTileEnd + ", expected positive integer.");
		}

		if(localTileEnd < localTileStart) {
			throw new Error("Invalid local tile start / end values, start value: " + localTileStart + " should be greater than or equal to end value: " + localTileEnd + ".");
		}

		let numberOfTiles = localTileEnd - localTileStart + 1;

		if(artByteBuffer.remaining() < numberOfTiles * 8) {
			throw new Error("Art file corrupted or invalid, missing full sprite property data.");
		}

		let tileWidths = [];

		for(let i = 0; i < numberOfTiles; i++) {
			tileWidths.push(artByteBuffer.readInt16());
		}

		let tileHeights = [];

		for(let i = 0; i < numberOfTiles; i++) {
			tileHeights.push(artByteBuffer.readInt16());
		}

		let tileAttributes = [];

		for(let i = 0; i < numberOfTiles; i++) {
			tileAttributes.push(artByteBuffer.readInt32());
		}

		let tileData = [];

		for(let i = 0; i < numberOfTiles; i++) {
			const numberOfPixels = tileWidths[i] * tileHeights[i];

			if(artByteBuffer.remaining() < numberOfPixels) {
				throw new Error("Art file corrupted or invalid, missing sprite pixel data for tile #" + (localTileStart + i) + ".");
			}

			tileData.push(artByteBuffer.copy(artByteBuffer.offset, artByteBuffer.offset + numberOfPixels).toBuffer());
			artByteBuffer.skip(numberOfPixels);
		}

		let tiles = [];

		for(let i = 0; i < numberOfTiles; i++) {
			try {
				tiles.push(new Art.Tile(localTileStart + i, tileWidths[i], tileHeights[i], tileData[i], tileAttributes[i]));
			}
			catch(error) {
				error.message = "Failed to parse tile #" + (localTileStart + i) + " from: " + error.message;
				throw error;
			}
		}

		return new Art(legacyTileCount, localTileStart, localTileEnd, tiles);
	}

	static readFrom(filePath) {
		if(utilities.isEmptyString(filePath)) {
			throw new Error("Missing or invalid art file path.");
		}

		if(Art.verbose) {
			console.log("Reading ART file: " + filePath);
		}

		let data = null;

		try {
			data = fs.readFileSync(filePath);
		}
		catch(error) {
			if(error.code === "ENOENT") {
				throw new Error("Art file does not exist!");
			}
			else if(error.code === "EISDIR") {
				throw new Error("Art file path is not a file!");
			}
			else {
				throw new Error("Failed to read art file with error code: " + error.code);
			}
		}

		let art = Art.deserialize(data);
		art.filePath = filePath;

		if(Art.verbose) {
			console.log("Processed ART file: " + art.getFileName() + " (Start: " + art.localTileStart + ", End: " + art.localTileEnd + ", Number of Tiles: " + art.tiles.length + ", Non-Empty: " + art.numberOfNonEmptyTiles() + ")");
		}

		return art;
	}

	writeTo(filePath) {
		let self = this;

		if(utilities.isEmptyString(filePath)) {
			throw new Error("Must specify file path to save to.");
		}

		const outputDirectory = utilities.getFilePath(filePath);

		if(utilities.isNonEmptyString(outputDirectory)) {
			fs.ensureDirSync(outputDirectory);
		}

		if(Art.verbose) {
			console.log("Writing ART file #" + self.number + " to file: " + filePath);
		}

		fs.writeFileSync(filePath, self.serialize());

		return filePath;
	}

	clone() {
		const self = this;

		return new Art(self.legacyTileCount, self.localTileStart, self.localTileEnd, self.tiles.map(function(tile) { return tile.clone(); }), self.filePath);
	}

	static isArt(value) {
		return value instanceof Art;
	}
}

Object.defineProperty(Art, "Version", {
	value: 1,
	enumerable: true
});

Object.defineProperty(Art, "DefaultNumberOfTiles", {
	value: 256,
	enumerable: true
});

Object.defineProperty(Art, "HeaderSize", {
	value: 4 * 4, // 16 bytes
	enumerable: true
});

Object.defineProperty(Art, "DefaultMetadataFileExtension", {
	value: "JSON",
	enumerable: true
});

Object.defineProperty(Art, "MetadataFormat", {
	value: {
		type: "object",
		strict: true,
		removeExtra: true,
		order: true,
		nonEmpty: true,
		required: true,
		format: {
			number: {
				type: "integer",
				validator: function(value) {
					return value >= 0;
				}
			},
			count: {
				type: "integer",
				validator: function(value) {
					return value >= 0;
				}
			},
			start: {
				type: "integer",
				validator: function(value) {
					return value >= 0;
				}
			},
			end: {
				type: "integer",
				validator: function(value) {
					return value >= 0;
				}
			},
			tiles: {
				type: "array",
				required: true,
				format: {
					type: "object",
					strict: true,
					removeExtra: true,
					order: true,
					nonEmpty: true,
					required: true,
					format: {
						number: {
							type: "integer",
							validator: function(value) {
								return value >= 0;
							}
						},
						attributes: {
							type: "object",
							strict: true,
							removeExtra: true,
							order: true,
							nonEmpty: true,
							required: true,
							format: {
								offset: {
									type: "object",
									strict: true,
									removeExtra: true,
									order: true,
									nonEmpty: true,
									required: true,
									format: {
										x: {
											type: "integer",
											validator: function(value) {
												return value >= Art.Tile.Attributes.Attribute.XOffset.min && value <= Art.Tile.Attributes.Attribute.XOffset.max;
											}
										},
										y: {
											type: "integer",
											validator: function(value) {
												return value >= Art.Tile.Attributes.Attribute.YOffset.min && value <= Art.Tile.Attributes.Attribute.YOffset.max;
											}
										}
									}
								},
								numberOfFrames: {
									type: "integer",
									validator: function(value) {
										return value >= Art.Tile.Attributes.Attribute.NumberOfFrames.min && value <= Art.Tile.Attributes.Attribute.NumberOfFrames.max;
									}
								},
								animation: {
									type: "object",
									strict: true,
									removeExtra: true,
									order: true,
									nonEmpty: true,
									required: true,
									format: {
										type: {
											type: "string",
											case: "title",
											trim: true,
											nonEmpty: true,
											required: true,
											validator: function(value) {
												for(let i = 0; i < Art.Tile.AnimationType.Types.length; i++) {
													if(value === Art.Tile.AnimationType.Types[i].name) {
														return true;
													}
												}

												return false;
											}
										},
										speed: {
											type: "integer",
											validator: function(value) {
												return value >= Art.Tile.Attributes.Attribute.AnimationSpeed.min && value <= Art.Tile.Attributes.Attribute.AnimationSpeed.max;
											}
										}
									}
								},
								extra: {
									type: "integer",
									validator: function(value) {
										return value >= Art.Tile.Attributes.Attribute.Extra.min && value <= Art.Tile.Attributes.Attribute.Extra.max;
									}
								}
							}
						}
					}
				}
			}
		}
	},
	enumerable: true
});

Object.defineProperty(Art, "properties", {
	value: new ArtProperties(),
	enumerable: false
});

Object.defineProperty(Art, "verbose", {
	enumerable: true,
	get() {
		return Art.properties.verbose;
	},
	set(value) {
		Art.properties.verbose = value;
	}
});

Object.defineProperty(Art, "metadataFileExtension", {
	enumerable: true,
	get() {
		return Art.properties.metadataFileExtension;
	},
	set(value) {
		Art.properties.metadataFileExtension = value;
	}
});

Object.defineProperty(Art, "Colour", {
	value: Colour,
	enumerable: true
});

Object.defineProperty(Art, "Palette", {
	value: Palette,
	enumerable: true
});

Object.defineProperty(Art, "Tile", {
	value: Tile,
	enumerable: true
});

module.exports = Art;
