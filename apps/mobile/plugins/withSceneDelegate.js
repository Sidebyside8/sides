let withInfoPlist, withDangerousMod;
try {
  const plugins = require('@expo/config-plugins');
  withInfoPlist = plugins.withInfoPlist;
  withDangerousMod = plugins.withDangerousMod;
} catch (e) {
  module.exports = (config) => config;
  return;
}

const fs = require('fs');
const path = require('path');

const SCENE_DELEGATE_CONTENT = `import UIKit

@objc(SceneDelegate)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let _ = (scene as? UIWindowScene) else { return }
  }

  func stateRestorationActivity(for scene: UIScene) -> NSUserActivity? {
    return nil
  }
}
`;

const withSceneDelegateFile = (config) => {
  return withDangerousMod(config, ['ios', async (config) => {
    const projectRoot = config.modRequest.platformProjectRoot;
    const projectName = config.modRequest.projectName;
    const iosDir = path.join(projectRoot, projectName);

    const swiftFilePath = path.join(iosDir, 'SceneDelegate.swift');
    fs.writeFileSync(swiftFilePath, SCENE_DELEGATE_CONTENT);
    console.log('[withSceneDelegate] Wrote SceneDelegate.swift');

    const appDelegatePath = path.join(iosDir, 'AppDelegate.swift');
    let appDelegate = fs.readFileSync(appDelegatePath, 'utf8');

    if (!appDelegate.includes('configurationForConnecting')) {
      const sceneConfigMethod = `
  // Scene lifecycle - required for iOS 27+
  public func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
  }
`;
      appDelegate = appDelegate.replace(
        '}\n\nclass ReactNativeDelegate',
        sceneConfigMethod + '}\n\nclass ReactNativeDelegate'
      );
      fs.writeFileSync(appDelegatePath, appDelegate);
      console.log('[withSceneDelegate] Patched AppDelegate.swift');
    }

    const pbxprojPath = path.join(projectRoot, projectName + '.xcodeproj', 'project.pbxproj');
    let pbxproj = fs.readFileSync(pbxprojPath, 'utf8');

    if (!pbxproj.includes('SceneDelegate.swift')) {
      const fileRefUUID = 'AA000001000000000000001A';
      const buildFileUUID = 'AA000001000000000000001B';

      const fileRefEntry = '\t\t' + fileRefUUID + ' /* SceneDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = SceneDelegate.swift; path = ' + projectName + '/SceneDelegate.swift; sourceTree = "<group>"; };\n';
      pbxproj = pbxproj.replace(/(\/\* End PBXFileReference section \*\/)/, fileRefEntry + '$1');

      const buildFileEntry = '\t\t' + buildFileUUID + ' /* SceneDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = ' + fileRefUUID + ' /* SceneDelegate.swift */; };\n';
      pbxproj = pbxproj.replace(/(\/\* End PBXBuildFile section \*\/)/, buildFileEntry + '$1');

      pbxproj = pbxproj.replace(
        /(F11748412D0307B40044C1D9 \/\* AppDelegate\.swift \*\/,\n)/,
        '$1\t\t\t\t' + fileRefUUID + ' /* SceneDelegate.swift */,\n'
      );

      pbxproj = pbxproj.replace(
        /(F11748422D0307B40044C1D9 \/\* AppDelegate\.swift in Sources \*\/,\n)/,
        '$1\t\t\t\t' + buildFileUUID + ' /* SceneDelegate.swift in Sources */,\n'
      );

      fs.writeFileSync(pbxprojPath, pbxproj);
      console.log('[withSceneDelegate] Added SceneDelegate.swift to project.pbxproj');
    }

    return config;
  }]);
};

const withSceneManifest = (config) => {
  return withInfoPlist(config, (config) => {
    config.modResults['UIApplicationSceneManifest'] = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [{
          UISceneConfigurationName: 'Default Configuration',
          UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
        }],
      },
    };
    return config;
  });
};

module.exports = (config) => {
  config = withSceneManifest(config);
  config = withSceneDelegateFile(config);
  return config;
};
