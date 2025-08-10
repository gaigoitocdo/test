// @ts-check

const {spawn, execSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const keepAsset = require('./keepAsset');
const {NodeSSH} = require('node-ssh');

// ✅ Production configuration
const PRODUCTION_DOMAIN = 'https://tme-tlegram.link';
const PRODUCTION_PATH = '/www/wwwroot/telegram-web';

const npmCmd = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
const version = process.argv[2] || 'same';
const changelog = process.argv[3] || '';

console.log('🚀 Starting PRODUCTION build for tme-tlegram.link...');
console.log('🌍 Domain:', PRODUCTION_DOMAIN);
console.log('📁 Target path:', PRODUCTION_PATH);

const child = spawn(npmCmd, ['run', 'change-version', version, changelog].filter(Boolean), {shell: true});
child.stdout.on('data', (chunk) => {
  console.log(chunk.toString());
});

const publicPath = __dirname + '/public/';
const distPath = __dirname + '/dist/';

// ✅ Production SSH config
let sshConfig;
try {
  sshConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'ssh.json'), 'utf8'));
  console.log('✅ SSH config loaded for production deployment');
} catch(err) {
  console.log('⚠️ No SSH config found, will skip deployment to server');
}

function copyFiles(source, destination) {
  if(!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const files = fs.readdirSync(source, {withFileTypes: true});
  files.forEach((file) => {
    const sourcePath = path.join(source, file.name);
    const destinationPath = path.join(destination, file.name);

    if(file.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
      console.log(`📄 Copied: ${file.name}`);
    } else if(file.isDirectory()) {
      copyFiles(sourcePath, destinationPath);
    }
  });
}

function clearOldFiles() {
  console.log('🧹 Cleaning old files...');
  
  const bundleFiles = fs.readdirSync(distPath);
  const files = fs.readdirSync(publicPath, {withFileTypes: true});
  
  let removedCount = 0;
  files.forEach((file) => {
    if(file.isDirectory() ||
      bundleFiles.some((bundleFile) => bundleFile === file.name) ||
      keepAsset(file.name)) {
      return;
    }

    fs.unlinkSync(publicPath + file.name);
    removedCount++;
  });
  
  console.log(`🗑️ Removed ${removedCount} old files`);
}

// ✅ Production manifest generator
function generateManifest() {
  const manifest = {
    name: 'Telebook',
    short_name: 'Telebook',
    description: 'Telegram Web App for Telebook',
    start_url: '/telebook/home?telegram=1',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#8B5CF6',
    orientation: 'portrait',
    scope: '/',
    icons: [
      {
        src: '/assets/img/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/assets/img/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ],
    categories: ['social', 'communication'],
    lang: 'vi'
  };
  
  fs.writeFileSync(path.join(publicPath, 'site.webmanifest'), JSON.stringify(manifest, null, 2));
  console.log('📱 Generated PWA manifest');
}

child.on('close', (code) => {
  if(code != 0) {
    console.log(`❌ Version change process exited with code ${code}`);
    process.exit(1);
  }

  console.log('🔨 Building for PRODUCTION...');
  
  // ✅ Set production environment
  process.env.NODE_ENV = 'production';
  process.env.VITE_DOMAIN = PRODUCTION_DOMAIN;
  
  const buildChild = spawn(npmCmd, ['run', 'build'], {
    shell: true,
    env: { ...process.env }
  });
  
  buildChild.stdout.on('data', (chunk) => {
    console.log(chunk.toString());
  });

  let error = '';
  buildChild.stderr.on('data', (chunk) => {
    error += chunk.toString();
  });

  buildChild.on('close', (code) => {
    if(code != 0) {
      console.error('❌ Build failed:', error);
      console.error(`Build process exited with code ${code}`);
      process.exit(1);
    } else {
      onCompiled();
    }
  });
});

const ssh = new NodeSSH();

const onCompiled = async() => {
  console.log('✅ Build completed successfully for PRODUCTION');
  
  // Copy built files to public
  console.log('📋 Copying dist files to public...');
  copyFiles(distPath, publicPath);
  
  // Clean old files
  clearOldFiles();
  
  // Generate production manifest
  generateManifest();
  
  // Create production info file
  const productionInfo = {
    domain: PRODUCTION_DOMAIN,
    buildTime: new Date().toISOString(),
    version: version,
    environment: 'production',
    paths: {
      api: `${PRODUCTION_DOMAIN}/api`,
      telebook: `${PRODUCTION_DOMAIN}/telebook`,
      assets: `${PRODUCTION_DOMAIN}/assets`
    }
  };
  
  fs.writeFileSync(path.join(publicPath, 'production-info.json'), JSON.stringify(productionInfo, null, 2));
  console.log('ℹ️ Generated production info file');

  if(!sshConfig) {
    console.log('✅ PRODUCTION build ready locally');
    console.log('📁 Files are in:', publicPath);
    console.log('🌍 Ready to deploy to:', PRODUCTION_DOMAIN);
    return;
  }

  // ✅ Deploy to production server
  console.log('🚀 Deploying to production server...');
  
  const archiveName = 'tme-tlegram-link-build.zip';
  const archivePath = path.join(__dirname, archiveName);
  
  // Create deployment archive
  execSync(`zip -r ${archivePath} * -x "node_modules/*" "src/*" ".git/*"`, {
    cwd: publicPath
  });
  console.log('📦 Created deployment archive');

  try {
    await ssh.connect({
      ...sshConfig,
      tryKeyboard: true
    });
    console.log('🔗 SSH connected to production server');
    
    // Backup current deployment
    const backupDir = `${sshConfig.publicPath}_backup_${Date.now()}`;
    await ssh.execCommand(`cp -r ${sshConfig.publicPath} ${backupDir}`);
    console.log('💾 Created backup of current deployment');
    
    // Clear current files
    await ssh.execCommand(`rm -rf ${sshConfig.publicPath}/*`);
    console.log('🧹 Cleared production directory');
    
    // Upload new files
    await ssh.putFile(archivePath, path.join(sshConfig.publicPath, archiveName));
    console.log('📤 Uploaded new deployment');
    
    // Extract files
    await ssh.execCommand(`cd ${sshConfig.publicPath} && unzip ${archiveName} && rm ${archiveName}`);
    console.log('📂 Extracted files on production server');
    
    // Set permissions
    await ssh.execCommand(`chmod -R 755 ${sshConfig.publicPath}`);
    console.log('🔐 Set production permissions');
    
    // Cleanup local archive
    fs.unlinkSync(archivePath);
    console.log('🗑️ Cleaned up local archive');
    
    console.log('');
    console.log('🎉 PRODUCTION DEPLOYMENT SUCCESSFUL!');
    console.log('🌍 Site: ' + PRODUCTION_DOMAIN);
    console.log('📱 Telegram Web App: ' + PRODUCTION_DOMAIN + '/telebook/home');
    console.log('🔧 API: ' + PRODUCTION_DOMAIN + '/api/test');
    console.log('');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  } finally {
    ssh.connection?.destroy();
  }
};

// ✅ Production deployment summary
process.on('exit', (code) => {
  if (code === 0) {
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ PRODUCTION BUILD COMPLETED');
    console.log('='.repeat(60));
    console.log('Domain:', PRODUCTION_DOMAIN);
    console.log('Build time:', new Date().toISOString());
    console.log('='.repeat(60));
  }
});