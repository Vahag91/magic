import React, { useRef, useEffect } from 'react';
import { View, Text, PanResponder } from 'react-native';

const CustomSlider = ({ value, onValueChange, min = 0, max = 100 }) => {
  const widthRef = useRef(0);
  const onValueChangeRef = useRef(onValueChange);
  const minRef = useRef(min);
  const maxRef = useRef(max);

  useEffect(() => { onValueChangeRef.current = onValueChange; }, [onValueChange]);
  useEffect(() => { minRef.current = min; }, [min]);
  useEffect(() => { maxRef.current = max; }, [max]);

  const handleTouch = (touchX) => {
    const width = widthRef.current;
    if (width <= 0) return;
    const _min = minRef.current;
    const _max = maxRef.current;
    let percentage = touchX / width;
    if (percentage < 0) percentage = 0;
    if (percentage > 1) percentage = 1;
    const newValue = _min + percentage * (_max - _min);
    onValueChangeRef.current(newValue);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => handleTouch(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => handleTouch(evt.nativeEvent.locationX),
    })
  ).current;

  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <View
      style={{ height: 40, justifyContent: 'center' }}
      onLayout={(e) => { widthRef.current = e.nativeEvent.layout.width; }}
      {...panResponder.panHandlers}
    >
      <View pointerEvents="none" style={{ height: 30, justifyContent: 'center' }}>
        <View style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ width: `${percentage}%`, height: '100%', backgroundColor: '#3b82f6' }} />
        </View>
        <View style={{
          position: 'absolute', left: `${percentage}%`, marginLeft: -10,
          width: 20, height: 20, borderRadius: 10, backgroundColor: 'white',
          borderWidth: 2, borderColor: '#3b82f6', shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, elevation: 3
        }} />
      </View>
      <View style={{ position: 'absolute', right: 0, top: -10 }} pointerEvents="none">
        <Text style={{ fontSize: 10, color: '#999', fontWeight: 'bold' }}>{value.toFixed(0)}</Text>
      </View>
    </View>
  );
};

export default CustomSlider;
