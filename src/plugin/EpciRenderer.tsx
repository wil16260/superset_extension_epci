import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import epci from '../assets/epci.json';

export default function EpciRenderer(props: any) {
  const { width, height, echartOptions } = props as any;
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);

  useEffect(() => {
    if (!(echarts as any).__epciRegistered) {
      echarts.registerMap('epci', epci as any);
      (echarts as any).__epciRegistered = true;
    }
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current);
    }
    chartRef.current.setOption(echartOptions, true);
    chartRef.current.resize({ width, height });
    return () => {};
  }, [echartOptions, width, height]);

  return <div ref={ref} style={{ width, height }} />;
}
