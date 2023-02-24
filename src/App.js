import React from 'react';
import freeice from 'freeice';
import { answer } from './answer';

const App = () => {

	const wsRef = React.useRef();
	const localStream = React.useRef();
	const remoteStream = React.useRef();
	
	const peerConnections = React.useRef();


	const onWebSocketOpen = React.useCallback(() => {
		console.log('ON WEBSOCKET OPEN');
	}, []);

	const onWebSocketClose = React.useCallback(() => {
		console.log('ON WEBSOCKET CLOSE');
	}, []);

	const onWebSocketError = React.useCallback(() => {
		console.log('ON WEBSOCKET ERROR');
	}, []);

	const onWebSocketMessage = React.useCallback((event) => {

		console.log("EVENT: ", { event });

		const response = JSON.parse(event.data);

		console.log("EVENT PARSE: ", { response });

		if (response.command === "answer") {

			console.log('SUCCESS ANSWER');

			handlerAnswer(response.data);	

		} else if (response.command === "candidate") {

			console.log("SUCCESS CANDIDATE");

			handleIceCandidate(response.data);

		}
	}, []);

	const handlerAnswer = (answer) => {
		peerConnections.current.setRemoteDescription(new RTCSessionDescription(answer));
	}

	const handleIceCandidate = (candidate) => {
		peerConnections.current.addIceCandidate(new RTCIceCandidate(candidate));
	}

	const onCreateOffer = async () => {
		peerConnections.current.onicecandidate = async (event) => {
			if (event.candidate) {

				console.log({ candidate: event.candidate });

				const apiCall = { type: "WEBRTC", command: "ice_candidate", data: event.candidate.candidate, serialNumber: 'Drone17'  };
				wsRef.current.send(JSON.stringify(apiCall));
			}
		}

		const offer = await peerConnections.current.createOffer();

		console.log({ offer });

		await peerConnections.current.setLocalDescription(offer);
		const apiCall = { type: "WEBRTC", command: "offer", data: offer.sdp, serialNumber: 'Drone17' };
		wsRef.current.send(JSON.stringify(apiCall));
	};




	const onWebSocket = React.useCallback(() => {
		wsRef.current = new WebSocket('wss://test.arcuas.io/websocket');

		wsRef.current.onopen = () => {
			onWebSocketOpen();
		}

		wsRef.current.onclose = () => {
			onWebSocketClose();
		}

		wsRef.current.onerror = () => {
			onWebSocketError();
		}

		wsRef.current.onmessage = (event) => {
			onWebSocketMessage(event);
		}

	}, [onWebSocketOpen, onWebSocketClose, onWebSocketError, onWebSocketMessage]);


	React.useEffect(() => {

		onWebSocket();

		return () => wsRef.current?.close();

	}, [onWebSocket]);


	React.useEffect(() => {
		const startCapture = async () => {

			peerConnections.current = new RTCPeerConnection({ iceServers: [
				{
					urls: ['stun:stun.l.google.com:19302']
				}
			] });

			const localVideo = await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: 1280, height: 720 } });
			localStream.current.srcObject = localVideo;

			localVideo.getTracks().forEach((track) => {

				console.log('Local video track: ', { track });

				peerConnections.current.addTrack(track, localVideo);
			});

			peerConnections.current.ontrack = (event) => {
				event.stream[0].getTracks().forEach((track) => {

					console.log('Remote video track: ', { track });

					remoteStream.addTrack(track);
				});
			}
		}

		startCapture();

	}, []);

  	return (
    	<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
			<video 
				autoPlay playsInline
				ref={localStream}  
				width='100%' height='200px' />

			<video 
				autoPlay playsInline
				ref={remoteStream}
				width='100%' height='200px' />


			<button onClick={onCreateOffer}> CREATE OFFER </button>

		</div>
  	);
}

export default App;
