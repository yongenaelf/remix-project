export default async () => {
  return {
    // @ts-ignore
    'src/Protobuf/contract/hello_world_contract.proto': (await import('raw-loader!./src/Protobuf/contract/hello_world_contract.proto')).default,
    // @ts-ignore
    'src/Protobuf/message/authority_info.proto': (await import('raw-loader!./src/Protobuf/message/authority_info.proto')).default,
    // @ts-ignore
    'src/Protobuf/reference/acs12.proto': (await import('raw-loader!./src/Protobuf/reference/acs12.proto')).default,
    // @ts-ignore
    'src/HelloWorld.cs': (await import('raw-loader!./src/HelloWorld.cs')).default,
    // @ts-ignore
    'src/HelloWorld.csproj': (await import('raw-loader!./src/HelloWorld.csproj')).default,
    // @ts-ignore
    'src/HelloWorldState.cs': (await import('raw-loader!./src/HelloWorldState.cs')).default,
    // @ts-ignore
    'test/Protobuf/message/authority_info.proto': (await import('raw-loader!./test/Protobuf/message/authority_info.proto')).default,
    // @ts-ignore
    'test/Protobuf/reference/acs12.proto': (await import('raw-loader!./test/Protobuf/reference/acs12.proto')).default,
    // @ts-ignore
    'test/Protobuf/stub/hello_world_contract.proto': (await import('raw-loader!./test/Protobuf/stub/hello_world_contract.proto')).default,
    // @ts-ignore
    'test/_Setup.cs': (await import('raw-loader!./test/_Setup.cs')).default,
    // @ts-ignore
    'test/HelloWorld.Tests.csproj': (await import('raw-loader!./test/HelloWorld.Tests.csproj')).default,
    // @ts-ignore
    'test/HelloWorldTests.cs': (await import('raw-loader!./test/HelloWorldTests.cs')).default,
    // @ts-ignore
    '.prettierrc.json': (await import('raw-loader!./.prettierrc')).default
  }
}