import React from 'react';
import * as Permissions from 'expo-permissions'
import { Camera } from 'expo-camera'
import Constants from 'expo-constants'
import * as FileSystem from 'expo-file-system'
import {  Alert,  StyleSheet,  Text,  View,  TouchableOpacity, Platform, ScrollView } from 'react-native';
import GalleryScreen from '../components/GalleryScreen';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as FaceDetector from 'expo-face-detector';

const landmarkSize = 2;

export default class LinksScreen extends React.Component {

  state = {
    flash: 'off',
    autoFocus: 'on',
    ratio: '16:9',
    permissionsGranted: false,
    pictureSize: undefined,
    pictureSizes: [],
    pictureSizeId: 0,
    showGallery: false,
    type: Camera.Constants.Type.front,
    faceDetecting: true,
    faces: [],
  };

  async componentWillMount() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({ permissionsGranted: status === 'granted' });
  }

  toggleView = () => {
    FileSystem.deleteAsync(FileSystem.cacheDirectory + 'photos');
    this.setState({ showGallery: !this.state.showGallery});
  }

  toggleFaceDetection = () => this.setState({ faceDetecting: !this.state.faceDetecting });


  onFacesDetected = ({ faces }) => this.setState({ faces });
  onFaceDetectionError = state => console.warn('Faces detection error:', state);

  takePicture = () => {
    if (this.camera) {
     this.camera.takePictureAsync({ onPictureSaved: this.onPictureSaved });
    }
};

handleMountError = ({ message }) => console.error(message);

onPictureSaved = async photo => {
    await FileSystem.makeDirectoryAsync(FileSystem.cacheDirectory + 'photos').catch(e => {
        console.log(e, 'Directory exists');
    });
    await FileSystem.moveAsync({
        from: photo.uri,
        to: `${FileSystem.cacheDirectory}photos/virtef_${Date.now()}.jpg`,
    });
    await this.setState({ showGallery: !this.state.showGallery });
  }


  collectPictureSizes = async () => {
    if (this.camera) {
      const pictureSizes = await this.camera.getAvailablePictureSizesAsync(this.state.ratio);
      let pictureSizeId = 0;
      if (Platform.OS === 'ios') {
        pictureSizeId = pictureSizes.indexOf('High');
      } else {
        // returned array is sorted in ascending order - default size is the largest one
        pictureSizeId = pictureSizes.length-1;
      }
      this.setState({ pictureSizes, pictureSizeId, pictureSize: pictureSizes[pictureSizeId] });
    }
  };

  renderGallery() {
    return <GalleryScreen onPress={this.toggleView.bind(this)} />;
  }

  renderNoPermissions = () => 
    <View style={styles.noPermissions}>
      <Text style={{ color: 'white' }}>
        Permiso a la camara denegado, no es posible abrirla :(
      </Text>
    </View>

  renderTopBar = () => 
    <View style={styles.topBar}>
      <TouchableOpacity style={styles.toggleButton} onPress={() => {
                  this.setState({
                    type:
                      this.state.type === Camera.Constants.Type.back
                        ? Camera.Constants.Type.front
                        : Camera.Constants.Type.back,
                  })}}>
        <MaterialIcons name={(this.state.type !== 0) ? 'loop' : 'loop'} size={38} color="white" />
      </TouchableOpacity>
      <TouchableOpacity onPress={this.toggleFaceDetection}>
            <MaterialIcons name="tag-faces" size={32} color={this.state.faceDetecting ? "white" : "#858585" } />
      </TouchableOpacity>
    </View>

  renderBottomBar = () =>
    <View style={styles.bottomBar}>
        <TouchableOpacity onPress={this.takePicture}>
          <Ionicons name="ios-radio-button-on" size={74} color="white" />
        </TouchableOpacity>
    </View> 


  renderFace({ bounds, faceID, rollAngle, yawAngle }) {
    return (
      <View
        key={faceID}
        transform={[
          { perspective: 600 },
          { rotateZ: `${rollAngle.toFixed(0)}deg` },
          { rotateY: `${yawAngle.toFixed(0)}deg` },
        ]}
        style={[
          styles.face,
          {
            ...bounds.size,
            left: bounds.origin.x,
            top: bounds.origin.y,
          },
        ]}>
        <Text style={styles.faceText}>ID: {faceID}</Text>
        <Text style={styles.faceText}>rollAngle: {rollAngle.toFixed(0)}</Text>
        <Text style={styles.faceText}>yawAngle: {yawAngle.toFixed(0)}</Text>
      </View>
    );
  }

  renderLandmarksOfFace(face) {
    const renderLandmark = position =>
      position && (
        <View
          style={[
            styles.landmark,
            {
              left: position.x - landmarkSize / 2,
              top: position.y - landmarkSize / 2,
            },
          ]}
        />
      );
    return (
      <View key={`landmarks-${face.faceID}`}>
        {renderLandmark(face.leftEyePosition)}
        {renderLandmark(face.rightEyePosition)}
        {renderLandmark(face.leftEarPosition)}
        {renderLandmark(face.rightEarPosition)}
        {renderLandmark(face.leftCheekPosition)}
        {renderLandmark(face.rightCheekPosition)}
        {renderLandmark(face.leftMouthPosition)}
        {renderLandmark(face.mouthPosition)}
        {renderLandmark(face.rightMouthPosition)}
        {renderLandmark(face.noseBasePosition)}
        {renderLandmark(face.bottomMouthPosition)}
      </View>
    );
  }

  renderFaces = () => 
    <View style={styles.facesContainer} pointerEvents="none">
      {this.state.faces.map(this.renderFace)}
    </View>
    

    renderLandmarks = () => 
    <View style={styles.facesContainer} pointerEvents="none">
      {this.state.faces.map(this.renderLandmarksOfFace)}
    </View>

  renderCamera = () =>
    (
      <View style={{ flex: 1 }}>
        <Camera
          ref={ref => {
            this.camera = ref;
          }}
          style={styles.camera}
          onCameraReady={this.collectPictureSizes}
          type={this.state.type}
          autoFocus={this.state.autoFocus}
          whiteBalance='auto'
          ratio={this.state.ratio}
          pictureSize='1280x720'
          onMountError={this.handleMountError}
          
          // onFacesDetected={this.handleFacesDetected}
          faceDetectorSettings={{
            mode: FaceDetector.Constants.Mode.accurate,
            // detectLandmarks: FaceDetector.Constants.Landmarks.none,
            runClassifications: FaceDetector.Constants.Classifications.all,
            minDetectionInterval: 100,
            tracking: true,
          }}

          onFacesDetected={this.state.faceDetecting ? this.onFacesDetected : undefined}
          onFaceDetectionError={this.onFaceDetectionError}
          >
            {this.state.faceDetecting && this.renderFaces()}
        {this.state.faceDetecting && this.renderLandmarks()}
          {this.renderTopBar()}
          {this.renderBottomBar()}
        </Camera>
       
      </View>
    );

  render()  {
    console.log(this.state.type)
    const cameraScreenContent = this.state.permissionsGranted
      ? this.renderCamera()
      : this.renderNoPermissions();
    const content = this.state.showGallery ? this.renderGallery() : cameraScreenContent;
    return <View style={styles.container2}>{content}</View>;
  }
}


LinksScreen.navigationOptions = {
  title: 'Reconocimiento facial',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 15,
    backgroundColor: '#fff',
  },
  container2: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Constants.statusBarHeight / 2,
  },
  bottomBar: {
    marginBottom: 20,
    backgroundColor: 'transparent',
    alignSelf: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  noPermissions: {
    flex: 1,
    alignItems:'center',
    justifyContent: 'center',
    padding: 10,
  },
  toggleButton: {
    height: 40,
    marginHorizontal: 2,
    marginBottom: 10,
    marginTop: 20,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomButton: {
    height: 58, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  facesContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    top: 0,
  },
  face: {
    padding: 10,
    borderWidth: 2,
    borderRadius: 2,
    position: 'absolute',
    borderColor: '#FFD700',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  landmark: {
    width: landmarkSize,
    height: landmarkSize,
    position: 'absolute',
    backgroundColor: 'red',
  },
  faceText: {
    color: '#FFD700',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: 10,
    backgroundColor: 'transparent',
  },
});