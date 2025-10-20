//
//
//
import { TAiDockerService } from '../types/TAiDockerService';
import { DOCKER } from '../consts/DOCKER';


//

export const AudioAudioClassificationDockerService: TAiDockerService = {
    Name: 'audio_audio_classification',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_audio_classification:v1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/audio/audio-classification`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/audio-audio-classification'
};

export const AudioAutomaticSpeechRecognitionDockerService: TAiDockerService = {
    Name: 'audio_automatic_speech_recognition',
    Port: 5000,
    ImageName: `${DOCKER.AI_ENGINE_PREFIX}_audio_automatic_speech_recognition:v1.0.0`,
    ImageContext: {
        context: `${process.cwd()}/.docker/ai-engines/services/audio/automatic-speech-recognition`,
        src: ['.', './requirements.txt']
    },
    InternalUrl: '/audio-automatic-speech-recognition'
};