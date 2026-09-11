#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using dnlib.DotNet;
using dnlib.DotNet.Emit;

namespace RustPilot.Patcher
{
    public static class InjectHelper
    {
        public static List<TypeDef> Inject(ModuleDefMD sourceMod, ModuleDefMD targetMod)
        {
            var typeMap = new Dictionary<TypeDef, TypeDef>();
            var newTypes = new List<TypeDef>();

            // 1. Create TypeDefs
            foreach (var srcType in sourceMod.Types)
            {
                if (srcType.IsGlobalModuleType) continue;
                var created = CreateTypeMapping(srcType, targetMod, typeMap);
                newTypes.Add(created);
            }

            // 2. Populate members (fields, method signatures, properties)
            foreach (var kvp in typeMap)
            {
                PopulateMembers(kvp.Key, kvp.Value, targetMod, typeMap);
            }

            // 3. Populate method bodies
            foreach (var kvp in typeMap)
            {
                PopulateMethodBodies(kvp.Key, kvp.Value, targetMod, typeMap);
            }

            return newTypes;
        }

        private static TypeDef CreateTypeMapping(TypeDef srcType, ModuleDefMD targetMod, Dictionary<TypeDef, TypeDef> typeMap)
        {
            var newType = new TypeDefUser(srcType.Namespace, srcType.Name);
            newType.Attributes = srcType.Attributes;
            typeMap[srcType] = newType;

            if (srcType.DeclaringType == null)
            {
                targetMod.Types.Add(newType);
            }

            foreach (var nested in srcType.NestedTypes)
            {
                var newNested = CreateTypeMapping(nested, targetMod, typeMap);
                newType.NestedTypes.Add(newNested);
            }

            return newType;
        }

        private static void PopulateMembers(TypeDef srcType, TypeDef dstType, ModuleDefMD targetMod, Dictionary<TypeDef, TypeDef> typeMap)
        {
            Importer importer = new Importer(targetMod);

            // Base type
            if (srcType.BaseType != null)
            {
                dstType.BaseType = MapTypeRef(srcType.BaseType, targetMod, typeMap, importer);
            }

            // Interfaces
            foreach (var iface in srcType.Interfaces)
            {
                dstType.Interfaces.Add(new InterfaceImplUser(MapTypeRef(iface.Interface, targetMod, typeMap, importer)));
            }

            // Fields
            foreach (var f in srcType.Fields)
            {
                var newF = new FieldDefUser(f.Name, MapFieldSig(f.FieldSig, targetMod, typeMap, importer), f.Attributes);
                dstType.Fields.Add(newF);
            }

            // Methods
            foreach (var m in srcType.Methods)
            {
                var newM = new MethodDefUser(m.Name, MapMethodSig(m.MethodSig, targetMod, typeMap, importer), m.ImplAttributes, m.Attributes);
                dstType.Methods.Add(newM);
            }
        }

        private static void PopulateMethodBodies(TypeDef srcType, TypeDef dstType, ModuleDefMD targetMod, Dictionary<TypeDef, TypeDef> typeMap)
        {
            Importer importer = new Importer(targetMod);

            for (int i = 0; i < srcType.Methods.Count; i++)
            {
                var srcMethod = srcType.Methods[i];
                var dstMethod = dstType.Methods[i];

                if (!srcMethod.HasBody) continue;

                var srcBody = srcMethod.Body;
                var dstBody = new CilBody(srcBody.InitLocals, new List<Instruction>(), new List<ExceptionHandler>(), new List<Local>());
                dstMethod.Body = dstBody;

                var localMap = new Dictionary<Local, Local>();
                foreach (var loc in srcBody.Variables)
                {
                    var newLoc = new Local(MapTypeSig(loc.Type, targetMod, typeMap, importer));
                    dstBody.Variables.Add(newLoc);
                    localMap[loc] = newLoc;
                }

                var instrMap = new Dictionary<Instruction, Instruction>();
                foreach (var instr in srcBody.Instructions)
                {
                    Instruction newInstr = new Instruction(instr.OpCode);
                    instrMap[instr] = newInstr;
                    dstBody.Instructions.Add(newInstr);
                }

                for (int j = 0; j < srcBody.Instructions.Count; j++)
                {
                    var srcInstr = srcBody.Instructions[j];
                    var dstInstr = dstBody.Instructions[j];

                    dstInstr.Operand = MapOperand(srcInstr.Operand, targetMod, typeMap, importer, localMap, instrMap);
                }

                foreach (var eh in srcBody.ExceptionHandlers)
                {
                    var newEh = new ExceptionHandler(eh.HandlerType);
                    if (eh.TryStart != null && instrMap.ContainsKey(eh.TryStart)) newEh.TryStart = instrMap[eh.TryStart];
                    if (eh.TryEnd != null && instrMap.ContainsKey(eh.TryEnd)) newEh.TryEnd = instrMap[eh.TryEnd];
                    if (eh.HandlerStart != null && instrMap.ContainsKey(eh.HandlerStart)) newEh.HandlerStart = instrMap[eh.HandlerStart];
                    if (eh.HandlerEnd != null && instrMap.ContainsKey(eh.HandlerEnd)) newEh.HandlerEnd = instrMap[eh.HandlerEnd];
                    if (eh.FilterStart != null && instrMap.ContainsKey(eh.FilterStart)) newEh.FilterStart = instrMap[eh.FilterStart];
                    if (eh.CatchType != null) newEh.CatchType = MapTypeRef(eh.CatchType, targetMod, typeMap, importer);
                    dstBody.ExceptionHandlers.Add(newEh);
                }
            }
        }

        private static object MapOperand(object operand, ModuleDefMD targetMod, Dictionary<TypeDef, TypeDef> typeMap, Importer importer, Dictionary<Local, Local> localMap, Dictionary<Instruction, Instruction> instrMap)
        {
            if (operand == null) return null;

            if (operand is ITypeDefOrRef tdr)
            {
                return MapTypeRef(tdr, targetMod, typeMap, importer);
            }

            if (operand is MethodSpec ms)
            {
                var method = MapOperand(ms.Method, targetMod, typeMap, importer, localMap, instrMap) as IMethodDefOrRef;
                var genArgs = new List<TypeSig>();
                if (ms.GenericInstMethodSig != null)
                {
                    foreach (var ga in ms.GenericInstMethodSig.GenericArguments)
                    {
                        genArgs.Add(MapTypeSig(ga, targetMod, typeMap, importer));
                    }
                }
                var newGis = new GenericInstMethodSig(genArgs);
                return new MethodSpecUser(method, newGis);
            }

            if (operand is MemberRef mr)
            {
                if (mr.DeclaringType != null)
                {
                    TypeDef targetDeclaringType = ResolveTargetTypeDef(mr.DeclaringType, targetMod, typeMap);
                    if (targetDeclaringType != null)
                    {
                        if (mr.IsFieldRef)
                        {
                            var localField = targetDeclaringType.FindField(mr.Name);
                            if (localField != null) return localField;

                            foreach (var targetF in targetDeclaringType.Fields)
                            {
                                if (targetF.Name == mr.Name)
                                {
                                    return targetF;
                                }
                            }
                        }
                        else // IsMethodRef
                        {
                            var localMethod = targetDeclaringType.FindMethod(mr.Name);
                            if (localMethod != null) return localMethod;

                            foreach (var targetM in targetDeclaringType.Methods)
                            {
                                if (targetM.Name == mr.Name)
                                {
                                    return targetM;
                                }
                            }
                        }
                    }
                }
                return importer.Import(mr);
            }

            if (operand is MethodDef md)
            {
                TypeDef targetDeclaringType = ResolveTargetTypeDef(md.DeclaringType, targetMod, typeMap);
                if (targetDeclaringType != null)
                {
                    var localM = targetDeclaringType.FindMethod(md.Name);
                    if (localM != null) return localM;
                    foreach (var targetM in targetDeclaringType.Methods)
                    {
                        if (targetM.Name == md.Name) return targetM;
                    }
                }
                return importer.Import(md);
            }

            if (operand is FieldDef fd)
            {
                TypeDef targetDeclaringType = ResolveTargetTypeDef(fd.DeclaringType, targetMod, typeMap);
                if (targetDeclaringType != null)
                {
                    var localF = targetDeclaringType.FindField(fd.Name);
                    if (localF != null) return localF;
                    foreach (var targetF in targetDeclaringType.Fields)
                    {
                        if (targetF.Name == fd.Name) return targetF;
                    }
                }
                return importer.Import(fd);
            }

            if (operand is IMethod m)
            {
                return importer.Import(m);
            }

            if (operand is IField f)
            {
                return importer.Import(f);
            }

            if (operand is Local loc && localMap.TryGetValue(loc, out var mappedLoc))
            {
                return mappedLoc;
            }
            if (operand is Instruction targetInstr && instrMap.TryGetValue(targetInstr, out var mappedInstr))
            {
                return mappedInstr;
            }
            if (operand is Instruction[] targetInstrs)
            {
                var arr = new Instruction[targetInstrs.Length];
                for (int i = 0; i < targetInstrs.Length; i++)
                {
                    arr[i] = instrMap.TryGetValue(targetInstrs[i], out var mi) ? mi : targetInstrs[i];
                }
                return arr;
            }

            return operand;
        }

        public static TypeDef ResolveTargetTypeDef(ITypeDefOrRef type, ModuleDefMD targetMod, Dictionary<TypeDef, TypeDef> typeMap)
        {
            if (type == null) return null;

            var td = type.ResolveTypeDef();
            if (td != null && typeMap.TryGetValue(td, out var mapped))
            {
                return mapped;
            }

            foreach (var mappedType in typeMap.Values)
            {
                if (mappedType.FullName == type.FullName || mappedType.Name == type.Name)
                    return mappedType;
            }

            TypeDef existing = targetMod.Find(type.FullName, true);
            if (existing != null)
            {
                return existing;
            }

            string fn = type.FullName.Replace('/', '+');
            existing = targetMod.Find(fn, true);
            if (existing != null)
            {
                return existing;
            }

            foreach (var t in targetMod.Types)
            {
                if (t.Name == type.Name || t.FullName == type.FullName) return t;
                foreach (var nested in t.NestedTypes)
                {
                    if (nested.Name == type.Name || nested.FullName == type.FullName) return nested;
                }
            }

            return null;
        }

        private static ITypeDefOrRef MapTypeRef(ITypeDefOrRef type, ModuleDefMD targetMod, Dictionary<TypeDef, TypeDef> typeMap, Importer importer)
        {
            if (type == null) return null;

            TypeDef targetTd = ResolveTargetTypeDef(type, targetMod, typeMap);
            if (targetTd != null)
            {
                return targetTd;
            }

            if (type is TypeSpec ts)
            {
                return new TypeSpecUser(MapTypeSig(ts.TypeSig, targetMod, typeMap, importer));
            }

            return importer.Import(type);
        }

        private static TypeSig MapTypeSig(TypeSig sig, ModuleDefMD targetMod, Dictionary<TypeDef, TypeDef> typeMap, Importer importer)
        {
            if (sig == null) return null;

            switch (sig.ElementType)
            {
                case ElementType.Class:
                case ElementType.ValueType:
                    var tdr = sig.ToTypeDefOrRef();
                    var targetTd = ResolveTargetTypeDef(tdr, targetMod, typeMap);
                    if (targetTd != null)
                    {
                        return sig.IsValueType ? (TypeSig)new ValueTypeSig(targetTd) : new ClassSig(targetTd);
                    }
                    return importer.Import(sig);

                case ElementType.SZArray:
                    return new SZArraySig(MapTypeSig(sig.Next, targetMod, typeMap, importer));

                case ElementType.Array:
                    var arr = (ArraySig)sig;
                    return new ArraySig(MapTypeSig(sig.Next, targetMod, typeMap, importer), arr.Rank, arr.Sizes, arr.LowerBounds);

                case ElementType.GenericInst:
                    var gi = (GenericInstSig)sig;
                    var genType = (ClassOrValueTypeSig)MapTypeSig(gi.GenericType, targetMod, typeMap, importer);
                    var genArgs = new List<TypeSig>();
                    foreach (var ga in gi.GenericArguments)
                    {
                        genArgs.Add(MapTypeSig(ga, targetMod, typeMap, importer));
                    }
                    return new GenericInstSig(genType, genArgs);

                default:
                    return importer.Import(sig);
            }
        }

        private static FieldSig MapFieldSig(FieldSig sig, ModuleDefMD targetMod, Dictionary<TypeDef, TypeDef> typeMap, Importer importer)
        {
            if (sig == null) return null;
            return new FieldSig(MapTypeSig(sig.Type, targetMod, typeMap, importer));
        }

        private static MethodSig MapMethodSig(MethodSig sig, ModuleDefMD targetMod, Dictionary<TypeDef, TypeDef> typeMap, Importer importer)
        {
            if (sig == null) return null;
            var ret = MapTypeSig(sig.RetType, targetMod, typeMap, importer);
            var pars = new List<TypeSig>();
            foreach (var p in sig.Params)
            {
                pars.Add(MapTypeSig(p, targetMod, typeMap, importer));
            }
            var newSig = new MethodSig(sig.CallingConvention, (uint)sig.GenParamCount, ret, pars);
            newSig.HasThis = sig.HasThis;
            newSig.ExplicitThis = sig.ExplicitThis;
            return newSig;
        }
    }
}
