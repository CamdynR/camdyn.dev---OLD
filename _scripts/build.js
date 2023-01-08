// Pull in packages
const FS = require('fs-extra');
const SHOWDOWN = require('showdown');
// Setup markdown settings
SHOWDOWN.setFlavor('github');
SHOWDOWN.setOption('metadata', true);
// Create constants for reference later
const SPLIT = process.platform == 'win32' ? '\\' : '/';
const SRC = __dirname.split(SPLIT).slice(0,-1).join(SPLIT)+`${SPLIT}src`;
const DIST = __dirname.split(SPLIT).slice(0,-1).join(SPLIT)+`${SPLIT}dist`;
const TPL = __dirname.split(SPLIT).slice(0,-1).join(SPLIT)+`${SPLIT}_templates/post.html`;

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
let postTemplate = FS.readFileSync(TPL, { encoding: 'UTF8' });
mdFiles.forEach(file => {
	// Create a path to write the destination file to
  let distFile = `${DIST}${file.replace(SRC, '').replace('.md', '.html')}`;
	// Grab the markdown input
  let mdInput = FS.readFileSync(file, { encoding: 'UTF8' });
	// Create HTML from the markdown
	let html = converter.makeHtml(mdInput);
	// Grab the metadata
	let metadata = converter.getMetadata();
	// Grab the time
	let postDate = new Date(metadata.date);
	let timeStr = postDate.toDateString().split(' ').slice(1).join(' ');
	timeStr = timeStr.slice(0, timeStr.indexOf(' ')) + '.' + timeStr.slice(timeStr.indexOf(' '));
	timeStr = timeStr.slice(0, timeStr.lastIndexOf(' ')) + ',' + timeStr.slice(timeStr.lastIndexOf(' '));
	if (timeStr.split(' ')[1].startsWith('0')) {
		timeStr = timeStr.split(' ');
		timeStr[1] = timeStr[1].substring(1);
		timeStr = timeStr.join(' ');
	}
	let year = `${postDate.getFullYear()}`;
	let month = `${postDate.getMonth() + 1}`;
	if (month.length == 1) month = `0${month}`;
	let day = `${postDate.getDate()}`;
	if (day.length == 1) day = `0${day}`;
	let datetimeStr = `${year}-${month}-${day}`;
	// Create a new post from the template
	let post = postTemplate.replaceAll('{{TITLE}}', metadata.title);
	post = post.replaceAll('{{TIME}}', timeStr);
	post = post.replaceAll('{{DATETIME}}', datetimeStr);
	post = post.replaceAll('{{BODY}}', html);
	// Write to destination folder
  FS.outputFileSync(distFile, post);
});