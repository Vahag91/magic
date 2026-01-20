/**
 * @format
 */

import 'react-native-gesture-handler/jestSetup';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(async () => ({ didCancel: true })),
  launchImageLibrary: jest.fn(async () => ({ didCancel: true })),
}));

jest.mock('@react-native-documents/picker', () => ({
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: (err) => Boolean(err && typeof err === 'object' && 'code' in err),
  pick: jest.fn(async () => []),
  types: { images: 'public.image' },
}));

jest.mock('react-native-purchases', () => ({
  setLogLevel: jest.fn(),
  configure: jest.fn(async () => {}),
  getCustomerInfo: jest.fn(async () => ({
    entitlements: { active: {}, all: {} },
    activeSubscriptions: [],
    allPurchasedProductIdentifiers: [],
  })),
  getOfferings: jest.fn(async () => ({ current: { availablePackages: [] }, all: {} })),
  purchasePackage: jest.fn(async () => ({ customerInfo: { entitlements: { active: {}, all: {} } } })),
  restorePurchases: jest.fn(async () => ({ entitlements: { active: {}, all: {} } })),
  logIn: jest.fn(async () => ({ customerInfo: { entitlements: { active: {}, all: {} } } })),
  logOut: jest.fn(async () => ({ entitlements: { active: {}, all: {} } })),
  syncPurchases: jest.fn(async () => {}),
  addCustomerInfoUpdateListener: jest.fn(),
  removeCustomerInfoUpdateListener: jest.fn(),
  LOG_LEVEL: { VERBOSE: 'VERBOSE', WARN: 'WARN' },
}));

jest.mock('react-native-permissions', () => ({
  check: jest.fn(async () => 'granted'),
  request: jest.fn(async () => 'granted'),
  openSettings: jest.fn(async () => {}),
  RESULTS: {
    UNAVAILABLE: 'unavailable',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    GRANTED: 'granted',
    LIMITED: 'limited',
  },
  PERMISSIONS: {
    IOS: { CAMERA: 'ios.permission.CAMERA' },
    ANDROID: {},
  },
}));

jest.mock('@shopify/react-native-skia', () => {
  const { View } = require('react-native');

  return {
    Canvas: View,
    Circle: View,
    Group: View,
    Image: View,
    Path: View,
    Rect: View,
    useImage: () => null,
    ImageFormat: { PNG: 0, JPEG: 1, WEBP: 2 },
    Skia: {
      Color: () => 0,
      Path: { Make: () => ({ moveTo: () => {}, lineTo: () => {}, close: () => {} }) },
      Paint: () => ({
        setStyle: () => {},
        setStrokeWidth: () => {},
        setColor: () => {},
        setAntiAlias: () => {},
        setStrokeCap: () => {},
        setStrokeJoin: () => {},
      }),
      Data: { fromURI: async () => null, fromBase64: () => null },
      Image: { MakeImageFromEncoded: () => null },
      Surface: {
        Make: () => ({
          getCanvas: () => ({
            clear: () => {},
            drawImage: () => {},
            drawPath: () => {},
          }),
          makeImageSnapshot: () => ({ encodeToBase64: () => '' }),
        }),
      },
    },
  };
});

jest.mock('react-native-fs', () => ({
  readFile: jest.fn(async () => ''),
  writeFile: jest.fn(async () => {}),
  unlink: jest.fn(async () => {}),
  exists: jest.fn(async () => false),
  DocumentDirectoryPath: '/tmp',
  TemporaryDirectoryPath: '/tmp',
}));

jest.mock('react-native-get-random-values', () => ({}));
jest.mock('react-native-url-polyfill/auto', () => ({}));

jest.mock('@react-native-community/image-editor', () => ({
  cropImage: jest.fn(async () => ({ uri: 'file:///tmp/mock.png', type: 'image/png', base64: '' })),
}));

jest.mock('reanimated-color-picker', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    HueSlider: View,
    Panel1: View,
    Preview: View,
    Swatches: View,
  };
});

jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: {
    getAlbums: jest.fn(async () => []),
    getPhotos: jest.fn(async () => ({ edges: [], page_info: {} })),
    saveAsset: jest.fn(async () => ({ node: { image: { uri: 'file:///tmp/mock.jpg' } } })),
  },
  iosRequestAddOnlyGalleryPermission: jest.fn(async () => 'granted'),
}));

jest.mock('react-native-share', () => ({
  open: jest.fn(async () => ({})),
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
