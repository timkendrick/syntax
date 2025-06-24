#!/usr/bin/env node
const fs = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const process = require('node:process');

const [inputPath, outputPath] = process.argv.slice(2);

class ExitError extends Error {
  code;
  constructor(code, message) {
    super(`Error: ${message}`);
    this.name = ExitError.name;
    this.code = code;
  }
}

try {
  if (!inputPath) throw new ExitError(1, 'Missing package.json input path');
  const inputDirPath =
    path.basename(inputPath) === 'package.json' ? path.dirname(inputPath) : inputPath;
  const outputDirPath =
    path.basename(outputPath) === 'package.json' ? path.dirname(outputPath) : outputPath;
  const inputPkgPath = path.join(inputDirPath, 'package.json');
  const pkgSource = (() => {
    try {
      return fs.readFileSync(inputPkgPath, 'utf-8');
    } catch (error) {
      throw new ExitError(1, `Failed to read package.json: ${inputPkgPath} (${error.code})\n`);
    }
  })();
  const pkg = (() => {
    try {
      return JSON.parse(pkgSource);
    } catch {
      throw new ExitError(1, `Invalid package.json contents: ${inputPkgPath}\n`);
    }
  })();
  const {
    name,
    version,
    license,
    description,
    author,
    repository,
    keywords,
    bin,
    dependencies,
    bundleDependencies,
    optionalDependencies,
    pkg: overrides,
  } = pkg;
  const pkgFields = {
    name,
    version,
    license,
    description,
    author,
    repository,
    keywords,
    dependencies,
    bundleDependencies,
    optionalDependencies,
    ...overrides,
  };
  const updatedPkg = fixPackageWorkspaceDependencies(pkgFields, inputPkgPath);
  const json = formatPackageJson(updatedPkg);
  if (outputDirPath) {
    writeFile(outputDirPath, 'package.json', json);
    copyReadmeFiles(inputDirPath, outputDirPath);
    if (bin != null && typeof bin === 'object') {
      copyExecutables(bin, inputDirPath, outputDirPath);
    }
    exit(0);
  } else {
    process.stdout.write(json, (error) => {
      if (error) {
        exit(1, `Failed to write output JSON: (${error.code})`);
      } else {
        exit(0);
      }
    });
  }
} catch (error) {
  if (error instanceof ExitError) {
    exit(error.code, error.message);
  } else {
    throw error;
  }
}

function fixPackageWorkspaceDependencies(pkg, inputPkgPath) {
  const require = createRequire(path.resolve(process.cwd(), inputPkgPath));
  return Object.fromEntries(
    Object.entries(pkg).map(([key, value]) => {
      if (!isDependenciesPackageField(key) || !value) return [key, value];
      return [key, fixWorkspaceDependencyVersions(value, require)];
    }),
  );
}

function fixWorkspaceDependencyVersions(dependencies, require) {
  return Object.fromEntries(
    Object.entries(dependencies).map((dependency) => {
      const [name, version] = dependency;
      if (version === 'workspace:*') {
        const workspaceVersion = require(path.join(name, 'package.json')).version;
        return [name, workspaceVersion];
      }
      return dependency;
    }),
  );
}

function isDependenciesPackageField(key) {
  switch (key) {
    case 'dependencies':
    case 'devDependencies':
    case 'peerDependencies':
      return true;
    default:
      return false;
  }
}

function formatPackageJson(pkg) {
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function copyReadmeFiles(inputPath, outputPath) {
  const packageFiles = fs.readdirSync(inputPath);
  const readmeFilenames = packageFiles.filter(
    (file) => path.basename(file, path.extname(file)) === 'README',
  );
  for (const readmeFilename of readmeFilenames) {
    copyFile(readmeFilename, inputPath, outputPath);
  }
}

function copyExecutables(bin, inputPath, outputPath) {
  const executablePaths = Object.values(bin);
  const executableDirectories = new Set(
    executablePaths.map((path) => path.split('/').slice(0, -1).join('/')).filter(Boolean),
  );
  for (const executableDirectory of executableDirectories) {
    ensureDirectory(outputPath, executableDirectory);
  }
  for (const executablePath of executablePaths) {
    copyFile(executablePath, inputPath, outputPath);
  }
}

function ensureDirectory(outputPath, directoryFilename) {
  const outputFilePath = path.join(outputPath, directoryFilename);
  try {
    fs.mkdirSync(outputFilePath, { recursive: true });
  } catch (error) {
    throw new ExitError(
      1,
      `Failed to create directory ${directoryFilename}: ${outputFilePath} (${error.code})`,
    );
  }
}

function writeFile(outputPath, filename, data) {
  const outputFilePath = path.join(outputPath, filename);
  try {
    fs.writeFileSync(outputFilePath, data);
  } catch (error) {
    throw new ExitError(1, `Failed to write ${filename}: ${outputFilePath} (${error.code})`);
  }
}

function copyFile(filename, inputPath, outputPath) {
  const inputFilePath = path.join(inputPath, filename);
  const outputFilePath = path.join(outputPath, filename);
  try {
    fs.copyFileSync(inputFilePath, outputFilePath);
  } catch (error) {
    throw new ExitError(1, `Failed to write ${filename}: ${outputFilePath} (${error.code})`);
  }
}

function exit(code, message) {
  if (typeof message === 'string') process.stderr.write(`${message}\n`);
  process.exit(code);
}
