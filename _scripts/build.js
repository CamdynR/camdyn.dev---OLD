const FS = require('fs-extra');
const SHOWDOWN = require('showdown');
SHOWDOWN.setFlavor('github');
SHOWDOWN.setOption('completeHTMLDocument', true);
SHOWDOWN.setOption('metadata', true);
const SPLIT = process.platform == 'win32' ? '\\' : '/';
const SRC = __dirname.split(SPLIT).slice(0,-1).join(SPLIT)+`${SPLIT}src`;
const DIST = __dirname.split(SPLIT).slice(0,-1).join(SPLIT)+`${SPLIT}dist`;

/**
 *
 * @param {string} dir the directory with which to search for files
 * @param {array<string>} exclude A list of files / directories to exclude in
 *                                file search;
 * @returns {array<string>} an array of all of the paths of the found files
 */
function recursiveFileSearch(dir, exclude) {
  if (!exclude) exclude = [];
	let entitiesInDir, dirsInDir, filesInDir;
	// Get everything in the directory first
	entitiesInDir = FS.readdirSync(dir);
	// Filter out everything that's not allowed
	entitiesInDir = entitiesInDir.filter((entity) => {
		if (exclude.includes(entity)) return false;
		if (entity.charAt(0) == '.' || entity.charAt(0) == '_') return false;
		return true;
	});
	// Separate the directories and files
	filesInDir = [];
	dirsInDir = entitiesInDir.filter((entity) => {
		// if it's a directory keep it so it can be stored in dirsInDir
		if (FS.lstatSync(`${dir}${SPLIT}${entity}`).isDirectory()) return true;
		// otherwise add it to our list of files
		filesInDir.push(`${dir}${SPLIT}${entity}`);
		// and filter it out by returning false
		return false;
	});
	// Add all of the files in the directories we found in our main files array
	dirsInDir.forEach((subDir) => {
		filesInDir = filesInDir.concat(recursiveFileSearch(`${dir}${SPLIT}${subDir}`, []));
	});
	// Return our main files array
	return filesInDir;
}

let fileList = recursiveFileSearch(SRC);

// Find the markdown files
mdFiles = fileList.filter(file => file.endsWith('.md'));
otherFiles = fileList.filter(file => !file.endsWith('.md'));

// Delete the docs directory
FS.emptyDirSync(DIST);

// Copy over the other files first
otherFiles.forEach(file => {
  let distFile = `${DIST}${file.replace(SRC, '')}`;
  FS.outputFileSync(distFile, FS.readFileSync(file));
});

// Conver the markdown files to HTML and copy them over
let converter = new SHOWDOWN.Converter();
mdFiles.forEach(file => {
  let distFile = `${DIST}${file.replace(SRC, '').replace('.md', '.html')}`;
  let mdInput = FS.readFileSync(file, { encoding: 'UTF8' });
  FS.outputFileSync(distFile, converter.makeHtml(mdInput));
});

console.log(mdFiles);
console.log(otherFiles);